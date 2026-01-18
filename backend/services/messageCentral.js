const axios = require('axios');

// Message Central API configuration
const MESSAGE_CENTRAL_BASE_URL = 'https://cpaas.messagecentral.com/verification/v3';
const CUSTOMER_ID = process.env.MESSAGE_CENTRAL_CUSTOMER_ID || 'C-88D511C645354BC';
const AUTH_TOKEN = process.env.MESSAGE_CENTRAL_AUTH_TOKEN || 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDLTg4RDUxMUM2NDUzNTRCQyIsImlhdCI6MTc2MzAyMjA5NiwiZXhwIjoxOTIwNzAyMDk2fQ.KECOqHMJWclb9rbUSDtts3jO11qxApb6Yml5LIM8RfCh5_yZnXAWnS6L33HsgtbUGNJbDyAMJcFN3TOKyET7UA';

/**
 * Send OTP via Message Central
 * @param {string} mobileNumber - Mobile number without country code
 * @param {string} countryCode - Country code (default: 91 for India)
 * @param {string} flowType - Flow type: SMS or VOICE (default: SMS)
 * @returns {Promise<Object>} Response with verificationId
 */
const sendOTP = async (mobileNumber, countryCode = '91', flowType = 'SMS') => {
  console.log('[MESSAGE_CENTRAL] Sending OTP request...');
  console.log('[MESSAGE_CENTRAL] Request params:', { mobileNumber, countryCode, flowType, customerId: CUSTOMER_ID });
  
  try {
    const url = `${MESSAGE_CENTRAL_BASE_URL}/send`;
    console.log('[MESSAGE_CENTRAL] API URL:', url);
    
    const requestConfig = {
      params: {
        countryCode,
        customerId: CUSTOMER_ID,
        flowType,
        mobileNumber,
      },
      headers: {
        authToken: AUTH_TOKEN,
      },
    };
    
    console.log('[MESSAGE_CENTRAL] Making POST request to Message Central...');
    const response = await axios.post(url, null, requestConfig);

    console.log('[MESSAGE_CENTRAL] Response status:', response.status);
    console.log('[MESSAGE_CENTRAL] Response data:', JSON.stringify(response.data, null, 2));

    // Message Central returns verificationId nested in data.data.verificationId
    const verificationId = response.data?.data?.verificationId 
                         || response.data?.verificationId 
                         || response.data?.id 
                         || response.data?.verification_id;
    
    console.log('[MESSAGE_CENTRAL] Extracted verification ID:', verificationId);
    
    if (!verificationId) {
      console.warn('[MESSAGE_CENTRAL] Warning: No verification ID in response:', response.data);
    }

    return {
      success: true,
      data: response.data,
      verificationId: verificationId,
    };
  } catch (error) {
    console.error('[MESSAGE_CENTRAL] Error sending OTP:');
    console.error('[MESSAGE_CENTRAL] Error message:', error.message);
    console.error('[MESSAGE_CENTRAL] Error response status:', error.response?.status);
    console.error('[MESSAGE_CENTRAL] Error response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('[MESSAGE_CENTRAL] Error config:', {
      url: error.config?.url,
      method: error.config?.method,
      params: error.config?.params,
    });
    
    return {
      success: false,
      error: error.response?.data || error.message,
      message: 'Failed to send OTP via Message Central',
      statusCode: error.response?.status,
    };
  }
};

/**
 * Validate OTP via Message Central
 * @param {string} mobileNumber - Mobile number without country code
 * @param {string} countryCode - Country code (default: 91 for India)
 * @param {string} verificationId - Verification ID from send OTP response
 * @param {string} code - OTP code to validate
 * @returns {Promise<Object>} Validation result
 */
const validateOTP = async (mobileNumber, verificationId, code, countryCode = '91') => {
  console.log('[MESSAGE_CENTRAL] Validating OTP...');
  console.log('[MESSAGE_CENTRAL] Validation params:', { 
    mobileNumber, 
    verificationId, 
    codeLength: code?.length,
    countryCode 
  });
  
  try {
    const url = `${MESSAGE_CENTRAL_BASE_URL}/validateOtp`;
    
    const requestConfig = {
      params: {
        countryCode,
        mobileNumber,
        verificationId,
        customerId: CUSTOMER_ID,
        code,
      },
      headers: {
        authToken: AUTH_TOKEN,
      },
    };

    console.log('[MESSAGE_CENTRAL] Making GET request to validate OTP...');
    const response = await axios.get(url, requestConfig);

    console.log('[MESSAGE_CENTRAL] Validation response status:', response.status);
    console.log('[MESSAGE_CENTRAL] Validation response data:', JSON.stringify(response.data, null, 2));

    // Check multiple possible success indicators
    // Message Central returns: data.data.verificationStatus === 'VERIFICATION_COMPLETED' for success
    const isValid = response.data?.data?.verificationStatus === 'VERIFICATION_COMPLETED'
                 || response.data?.verificationStatus === 'VERIFICATION_COMPLETED'
                 || response.data?.valid === true 
                 || response.data?.status === 'SUCCESS' 
                 || response.data?.verified === true
                 || response.data?.data?.valid === true
                 || response.data?.data?.status === 'SUCCESS'
                 || (response.data?.message === 'SUCCESS' && response.data?.responseCode === 200);

    console.log('[MESSAGE_CENTRAL] OTP validation result:', isValid ? 'VALID' : 'INVALID');
    console.log('[MESSAGE_CENTRAL] Verification status:', response.data?.data?.verificationStatus || response.data?.verificationStatus || 'N/A');

    return {
      success: true,
      data: response.data,
      isValid: isValid,
    };
  } catch (error) {
    console.error('[MESSAGE_CENTRAL] Error validating OTP:');
    console.error('[MESSAGE_CENTRAL] Error message:', error.message);
    console.error('[MESSAGE_CENTRAL] Error response status:', error.response?.status);
    console.error('[MESSAGE_CENTRAL] Error response data:', JSON.stringify(error.response?.data, null, 2));
    
    return {
      success: false,
      error: error.response?.data || error.message,
      message: 'Failed to validate OTP via Message Central',
      isValid: false,
    };
  }
};

module.exports = {
  sendOTP,
  validateOTP,
};
