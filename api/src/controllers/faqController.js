const FAQ = require('../models/FAQ');

// Create a new FAQ
const createFAQ = async (req, res) => {
  try {
    const { question, answer, category = 'GENERAL', order = 0 } = req.body;
    const createdBy = req.user.id || req.user.userId;

    // Validate required fields
    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'FAQ question is required'
      });
    }

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'FAQ answer is required'
      });
    }

    // Create FAQ
    const faq = new FAQ({
      question: question.trim(),
      answer: answer.trim(),
      category: category.toUpperCase(),
      order: parseInt(order),
      createdBy
    });

    await faq.save();

    // Populate creator details
    await faq.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: faq
    });

  } catch (error) {
    console.error('Create FAQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create FAQ',
      error: error.message
    });
  }
};

// Get all FAQs (public - for residents)
const getAllFAQs = async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;

    const query = { isActive: true };
    if (category) {
      query.category = category.toUpperCase();
    }

    const faqs = await FAQ.find(query)
      .populate('createdBy', 'name')
      .populate('lastUpdatedBy', 'name')
      .sort({ order: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FAQ.countDocuments(query);

    res.status(200).json({
      success: true,
      data: faqs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get all FAQs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs',
      error: error.message
    });
  }
};

// Get all FAQs for admin (including inactive)
const getAllFAQsForAdmin = async (req, res) => {
  try {
    const { category, isActive, page = 1, limit = 20 } = req.query;

    const query = {};
    if (category) {
      query.category = category.toUpperCase();
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const faqs = await FAQ.find(query)
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .sort({ order: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FAQ.countDocuments(query);

    res.status(200).json({
      success: true,
      data: faqs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get all FAQs for admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs',
      error: error.message
    });
  }
};

// Get FAQ by ID
const getFAQById = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id)
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email');

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    res.status(200).json({
      success: true,
      data: faq
    });

  } catch (error) {
    console.error('Get FAQ by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ',
      error: error.message
    });
  }
};

// Update FAQ
const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, isActive, order } = req.body;
    const userId = req.user.id || req.user.userId;

    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    // Update fields
    if (question !== undefined) faq.question = question.trim();
    if (answer !== undefined) faq.answer = answer.trim();
    if (category !== undefined) faq.category = category.toUpperCase();
    if (isActive !== undefined) faq.isActive = isActive;
    if (order !== undefined) faq.order = parseInt(order);
    
    faq.lastUpdatedBy = userId;

    await faq.save();

    // Populate updated FAQ
    await faq.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'lastUpdatedBy', select: 'name email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      data: faq
    });

  } catch (error) {
    console.error('Update FAQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FAQ',
      error: error.message
    });
  }
};

// Delete FAQ
const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    await FAQ.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully'
    });

  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ',
      error: error.message
    });
  }
};

// Get FAQ categories
const getFAQCategories = async (req, res) => {
  try {
    const categories = await FAQ.distinct('category', { isActive: true });
    
    res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get FAQ categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ categories',
      error: error.message
    });
  }
};

// Get FAQ statistics
const getFAQStats = async (req, res) => {
  try {
    const totalFAQs = await FAQ.countDocuments();
    const activeFAQs = await FAQ.countDocuments({ isActive: true });
    const inactiveFAQs = await FAQ.countDocuments({ isActive: false });

    const categoryStats = await FAQ.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalFAQs,
        active: activeFAQs,
        inactive: inactiveFAQs,
        byCategory: categoryStats
      }
    });

  } catch (error) {
    console.error('Get FAQ stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ statistics',
      error: error.message
    });
  }
};

module.exports = {
  createFAQ,
  getAllFAQs,
  getAllFAQsForAdmin,
  getFAQById,
  updateFAQ,
  deleteFAQ,
  getFAQCategories,
  getFAQStats
};
