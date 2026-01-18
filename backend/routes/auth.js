const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const redis = require('../config/redis');
const { sendOTP, validateOTP } = require('../services/messageCentral');
const {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
} = require('../utils/auth');

/**
 * @route   POST /api/register
 * @desc    Register a new student
 * @access  Public
 */
router.post('/register', async (req, res) => {
  console.log('[REGISTER] Registration request received');
  console.log('[REGISTER] Request body:', { 
    fullName: req.body?.fullName ? '***' : 'missing',
    email: req.body?.email || 'missing',
    rollNumber: req.body?.rollNumber ? '***' : 'missing',
    mobileNumber: req.body?.mobileNumber || 'missing',
    countryCode: req.body?.countryCode || 'not provided',
    hasPassword: !!req.body?.password
  });

  try {
    const { fullName, email, rollNumber, password, mobileNumber, countryCode } = req.body;

    // Validation
    if (!fullName || !email || !rollNumber || !password) {
      console.log('[REGISTER] Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Validate mobile number if provided (required for Message Central OTP)
    if (!mobileNumber) {
      console.log('[REGISTER] Validation failed: Mobile number missing');
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required for OTP verification',
      });
    }

    console.log('[REGISTER] Checking if email exists in database...');
    // Check if email already exists
    const existingEmail = await prisma.student.findUnique({
      where: { email },
    });

    if (existingEmail) {
      console.log('[REGISTER] Email already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    console.log('[REGISTER] Checking if roll number exists in database...');
    // Check if roll number already exists
    const existingRollNumber = await prisma.student.findUnique({
      where: { rollNumber },
    });

    if (existingRollNumber) {
      console.log('[REGISTER] Roll number already exists:', rollNumber);
      return res.status(400).json({
        success: false,
        message: 'Roll number already registered',
      });
    }

    console.log('[REGISTER] Hashing password...');
    // Hash password
    const hashedPassword = await hashPassword(password);

    console.log('[REGISTER] Creating student record in database...');
    // Create student first
    const student = await prisma.student.create({
      data: {
        fullName,
        email,
        rollNumber,
        mobileNumber,
        password: hashedPassword,
        status: 'PENDING_ADMIN_APPROVAL',
        emailVerified: false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        rollNumber: true,
        mobileNumber: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    console.log('[REGISTER] Student created successfully. ID:', student.id);
    console.log('[REGISTER] Sending OTP via Message Central...');
    console.log('[REGISTER] OTP params:', { mobileNumber, countryCode: countryCode || '91' });

    // Send OTP via Message Central
    const otpCountryCode = countryCode || '91'; // Default to India
    const otpResult = await sendOTP(mobileNumber, otpCountryCode, 'SMS');

    console.log('[REGISTER] Message Central OTP response:', {
      success: otpResult.success,
      hasVerificationId: !!otpResult.verificationId,
      message: otpResult.message,
      error: otpResult.error ? 'Error present' : 'No error'
    });

    if (!otpResult.success || !otpResult.verificationId) {
      console.error('[REGISTER] OTP sending failed. Deleting student record...');
      console.error('[REGISTER] OTP Error details:', JSON.stringify(otpResult.error, null, 2));
      
      // If OTP sending fails, delete the student record
      try {
        await prisma.student.delete({ where: { id: student.id } });
        console.log('[REGISTER] Student record deleted due to OTP failure');
      } catch (deleteError) {
        console.error('[REGISTER] Error deleting student record:', deleteError.message);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        error: otpResult.message || 'Message Central API error',
        details: otpResult.error,
      });
    }

    console.log('[REGISTER] OTP sent successfully. Verification ID:', otpResult.verificationId);
    console.log('[REGISTER] Storing verification ID in Redis...');

    // Store verificationId in Redis with expiration (key: verification:email)
    // Expires in 10 minutes (600 seconds)
    const verificationKey = `verification:${email}`;
    try {
      await redis.set(verificationKey, otpResult.verificationId, { ex: 600 });
      console.log('[REGISTER] Verification ID stored in Redis successfully');
    } catch (redisError) {
      console.error('[REGISTER] Redis error:', redisError.message);
      // Still continue even if Redis fails, but log the error
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with OTP.',
      data: student,
    });
  } catch (error) {
    console.error('[REGISTER] Registration error occurred:');
    console.error('[REGISTER] Error message:', error.message);
    console.error('[REGISTER] Error stack:', error.stack);
    console.error('[REGISTER] Error name:', error.name);
    
    // If student was created but error occurred, try to clean up
    if (error.studentId) {
      try {
        await prisma.student.delete({ where: { id: error.studentId } });
        console.log('[REGISTER] Cleaned up student record after error');
      } catch (cleanupError) {
        console.error('[REGISTER] Failed to cleanup student record:', cleanupError.message);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/verify-otp
 * @desc    Verify OTP and mark email as verified
 * @access  Public
 */
router.post('/verify-otp', async (req, res) => {
  console.log('[VERIFY_OTP] OTP verification request received');
  console.log('[VERIFY_OTP] Request body:', { 
    email: req.body?.email || 'missing',
    otp: req.body?.otp ? `${req.body.otp.length} digits` : 'missing',
    countryCode: req.body?.countryCode || 'not provided'
  });

  try {
    const { email, otp, countryCode } = req.body;

    // Validation
    if (!email || !otp) {
      console.log('[VERIFY_OTP] Validation failed: Missing email or OTP');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    // OTP length validation (Message Central can send 4-6 digit OTPs)
    if (otp.length < 4 || otp.length > 6 || !/^\d+$/.test(otp)) {
      console.log('[VERIFY_OTP] Invalid OTP format. Length:', otp.length);
      return res.status(400).json({
        success: false,
        message: 'OTP must be 4-6 digits',
      });
    }

    // Find student
    const student = await prisma.student.findUnique({
      where: { email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if email is already verified
    if (student.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
      });
    }

    // Check if mobile number exists
    if (!student.mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number not found. Please register again.',
      });
    }

    // Get verificationId from Redis
    const verificationKey = `verification:${email}`;
    const verificationId = await redis.get(verificationKey);

    // Check if verificationId exists in Redis
    if (!verificationId) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or is invalid. Please register again.',
      });
    }

    // Validate OTP via Message Central
    const otpCountryCode = countryCode || '91';
    const validationResult = await validateOTP(
      student.mobileNumber,
      verificationId,
      otp,
      otpCountryCode
    );

    if (!validationResult.success || !validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: validationResult.message || 'Invalid OTP',
      });
    }

    // Delete verificationId from Redis after successful verification
    await redis.del(verificationKey);

    // Update student - mark email as verified
    await prisma.student.update({
      where: { email },
      data: {
        emailVerified: true,
      },
    });

    res.json({
      success: true,
      message: 'Email verified successfully. Waiting for admin approval.',
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/login
 * @desc    Login student
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find student
    const student = await prisma.student.findUnique({
      where: { email },
    });

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, student.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if email is verified
    if (!student.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first',
        status: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Check account status
    if (student.status === 'PENDING_ADMIN_APPROVAL') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending admin approval',
        status: 'PENDING_ADMIN_APPROVAL',
      });
    }

    if (student.status === 'REJECTED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been rejected',
        status: 'REJECTED',
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: student.id,
      email: student.email,
      rollNumber: student.rollNumber,
    });

    // Return student data (exclude password)
    const { password: _, ...studentData } = student;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        rollNumber: student.rollNumber,
        status: student.status,
      },
      status: student.status,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/me
 * @desc    Get current user (protected route)
 * @access  Private
 */
router.get('/me', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Find student
    const student = await prisma.student.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        rollNumber: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;
