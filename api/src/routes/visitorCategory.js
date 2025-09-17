const express = require('express');
const visitorCategoryController = require('../controllers/visitorCategoryController');

const router = express.Router();

/**
 * Visitor Category Routes
 * Provides predefined dropdown options for visitor registration
 */

/**
 * @route   GET /api/visitor-categories
 * @desc    Get all visitor categories
 * @access  Public
 */
router.get('/', visitorCategoryController.getAllCategories);

/**
 * @route   GET /api/visitor-categories/cab-services
 * @desc    Get cab service types
 * @access  Public
 */
router.get('/cab-services', visitorCategoryController.getCabServices);

/**
 * @route   GET /api/visitor-categories/delivery-services
 * @desc    Get delivery service types
 * @access  Public
 */
router.get('/delivery-services', visitorCategoryController.getDeliveryServices);

/**
 * @route   GET /api/visitor-categories/employee-types
 * @desc    Get employee types for flat employees
 * @access  Public
 */
router.get('/employee-types', visitorCategoryController.getEmployeeTypes);

module.exports = router;
