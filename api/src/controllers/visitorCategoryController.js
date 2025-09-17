const Visitor = require('../models/Visitor');

/**
 * Visitor Category Controller
 * Handles predefined dropdown options for visitor categories
 */
class VisitorCategoryController {
  
  /**
   * Get all service types for cab drivers
   * GET /api/visitor-categories/cab-services
   */
  static async getCabServices(req, res) {
    try {
      const cabServices = [
        'Uber',
        'Ola', 
        'Rapido',
        'Meru',
        'Easy Cabs',
        'Mega Cabs',
        'Others'
      ];

      res.status(200).json({
        success: true,
        data: {
          category: 'CAB_DRIVER',
          services: cabServices
        }
      });

    } catch (error) {
      console.error('Get cab services error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all service types for delivery agents
   * GET /api/visitor-categories/delivery-services
   */
  static async getDeliveryServices(req, res) {
    try {
      const deliveryServices = [
        'Amazon Delivery Agent',
        'Flipkart Delivery Agent',
        'Swiggy Delivery Agent',
        'Zomato Delivery Agent',
        'Zepto Delivery Agent',
        'Blinkit Delivery Agent',
        'BigBasket Delivery Agent',
        'Grofers Delivery Agent',
        'Others'
      ];

      res.status(200).json({
        success: true,
        data: {
          category: 'DELIVERY_AGENT',
          services: deliveryServices
        }
      });

    } catch (error) {
      console.error('Get delivery services error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all employee types for flat employees
   * GET /api/visitor-categories/employee-types
   */
  static async getEmployeeTypes(req, res) {
    try {
      const employeeTypes = [
        'House Help',
        'Electrician',
        'Plumber',
        'Milk Man',
        'Newspaper Boy',
        'Garbage Collector',
        'Maintenance Worker',
        'Security Guard',
        'Gardener',
        'Others'
      ];

      res.status(200).json({
        success: true,
        data: {
          category: 'FLAT_EMPLOYEE',
          types: employeeTypes
        }
      });

    } catch (error) {
      console.error('Get employee types error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all visitor categories
   * GET /api/visitor-categories
   */
  static async getAllCategories(req, res) {
    try {
      const categories = [
        {
          id: 'CAB_DRIVER',
          name: 'Cab Drivers',
          icon: 'car',
          description: 'Taxi and cab service providers'
        },
        {
          id: 'DELIVERY_AGENT',
          name: 'Delivery Agents',
          icon: 'package',
          description: 'Package and food delivery personnel'
        },
        {
          id: 'FLAT_EMPLOYEE',
          name: 'Flat Employees',
          icon: 'worker',
          description: 'House help and maintenance workers'
        },
        {
          id: 'OTHER',
          name: 'Others',
          icon: 'person',
          description: 'General visitors and guests'
        }
      ];

      res.status(200).json({
        success: true,
        data: {
          categories
        }
      });

    } catch (error) {
      console.error('Get all categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = VisitorCategoryController;
