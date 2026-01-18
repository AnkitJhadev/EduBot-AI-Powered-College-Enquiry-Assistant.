const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
} = require('../utils/auth');

// Middleware to verify admin authentication
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * @route   POST /api/admin/register
 * @desc    Register admin (only one admin allowed)
 * @access  Public
 */
router.post('/register', async (req, res) => {
  console.log('[ADMIN_REGISTER] Admin registration request received');
  
  try {
    const { fullName, email, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Check if admin already exists (only one admin allowed)
    const existingAdmin = await prisma.admin.findFirst();
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists. Only one admin account is allowed.',
      });
    }

    // Check if email already exists
    const existingEmail = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
      },
    });

    console.log('[ADMIN_REGISTER] Admin created successfully:', admin.email);

    res.status(201).json({
      success: true,
      message: 'Admin registration successful',
      data: admin,
    });
  } catch (error) {
    console.error('[ADMIN_REGISTER] Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin registration',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/admin/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', async (req, res) => {
  console.log('[ADMIN_LOGIN] Admin login request received');
  
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: 'admin',
    });

    const { password: _, ...adminData } = admin;

    console.log('[ADMIN_LOGIN] Admin logged in successfully:', admin.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: adminData,
    });
  } catch (error) {
    console.error('[ADMIN_LOGIN] Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/students
 * @desc    Get all students
 * @access  Private (Admin only)
 */
router.get('/students', authenticateAdmin, async (req, res) => {
  console.log('[ADMIN_GET_STUDENTS] Fetching all students');
  
  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        rollNumber: true,
        mobileNumber: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error('[ADMIN_GET_STUDENTS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching students',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/admin/students/:id/approve
 * @desc    Approve a student
 * @access  Private (Admin only)
 */
router.patch('/students/:id/approve', authenticateAdmin, async (req, res) => {
  console.log('[ADMIN_APPROVE_STUDENT] Approving student:', req.params.id);
  
  try {
    const { id } = req.params;

    const student = await prisma.student.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        rollNumber: true,
        status: true,
        emailVerified: true,
      },
    });

    console.log('[ADMIN_APPROVE_STUDENT] Student approved:', student.email);

    res.json({
      success: true,
      message: 'Student approved successfully',
      data: student,
    });
  } catch (error) {
    console.error('[ADMIN_APPROVE_STUDENT] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error approving student',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/admin/students/:id/reject
 * @desc    Reject a student
 * @access  Private (Admin only)
 */
router.patch('/students/:id/reject', authenticateAdmin, async (req, res) => {
  console.log('[ADMIN_REJECT_STUDENT] Rejecting student:', req.params.id);
  
  try {
    const { id } = req.params;

    const student = await prisma.student.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        rollNumber: true,
        status: true,
        emailVerified: true,
      },
    });

    console.log('[ADMIN_REJECT_STUDENT] Student rejected:', student.email);

    res.json({
      success: true,
      message: 'Student rejected successfully',
      data: student,
    });
  } catch (error) {
    console.error('[ADMIN_REJECT_STUDENT] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting student',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/me
 * @desc    Get current admin info
 * @access  Private (Admin only)
 */
router.get('/me', authenticateAdmin, async (req, res) => {
  try {
    const { password: _, ...adminData } = req.admin;
    res.json({
      success: true,
      data: adminData,
    });
  } catch (error) {
    console.error('[ADMIN_ME] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;
