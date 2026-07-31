const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const { protect, authorize } = require('../utils/authMiddleware');

// Generate contract number
const generateContractNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Contract.countDocuments();
  const sequence = (count + 1).toString().padStart(4, '0');
  return `CTR-${year}-${sequence}`;
};

// Get all contracts
router.get('/', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { employeeName: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const contracts = await Contract.find(query)
      .populate('employeeId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Contract.countDocuments(query);
    
    res.json({
      success: true,
      data: contracts,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total, 
        pages: Math.ceil(total / parseInt(limit)) 
      }
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get contracts statistics
router.get('/stats', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const total = await Contract.countDocuments();
    const active = await Contract.countDocuments({ status: 'active' });
    const expired = await Contract.countDocuments({ status: 'expired' });
    const pending = await Contract.countDocuments({ status: 'pending' });
    
    res.json({
      total,
      active,
      expired,
      pending
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single contract
router.get('/:id', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate('employeeId', 'name email phone');
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new contract
router.post('/', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const contractNumber = await generateContractNumber();
    const contract = new Contract({
      ...req.body,
      contractNumber,
      createdBy: req.user.id,
      status: 'draft'
    });
    await contract.save();
    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update contract
router.put('/:id', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Sign contract
router.patch('/:id/sign', protect, authorize(['hr', 'admin', 'employee']), async (req, res) => {
  try {
    const { role, signature, signedDate } = req.body;
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    
    if (role === 'employee') {
      contract.signedByEmployee = true;
      contract.employeeSignature = signature;
      contract.employeeSignedDate = signedDate || new Date();
    } else if (role === 'employer') {
      contract.signedByEmployer = true;
      contract.employerSignature = signature;
      contract.signedDate = signedDate || new Date();
    }
    
    if (contract.signedByEmployee && contract.signedByEmployer) {
      contract.status = 'active';
    } else {
      contract.status = 'pending';
    }
    
    contract.updatedAt = Date.now();
    await contract.save();
    
    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Terminate contract
router.patch('/:id/terminate', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const { reason, effectiveDate, notes } = req.body;
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    
    contract.status = 'terminated';
    contract.terminationReason = reason;
    contract.terminationDate = effectiveDate || new Date();
    contract.terminationNotes = notes;
    contract.updatedAt = Date.now();
    
    await contract.save();
    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error terminating contract:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Renew contract
router.post('/:id/renew', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const { newEndDate, newSalary, reason } = req.body;
    const oldContract = await Contract.findById(req.params.id);
    
    if (!oldContract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    
    // Mark old contract as renewed
    oldContract.status = 'renewed';
    oldContract.renewalReason = reason;
    await oldContract.save();
    
    // Create new contract
    const newContractNumber = await generateContractNumber();
    const newContract = new Contract({
      ...oldContract.toObject(),
      _id: undefined,
      contractNumber: newContractNumber,
      startDate: new Date(),
      endDate: newEndDate,
      salary: newSalary || oldContract.salary,
      status: 'draft',
      signedByEmployee: false,
      signedByEmployer: false,
      specialConditions: `${oldContract.specialConditions || ''}\nRenewed: ${reason}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newContract.save();
    res.json({ success: true, data: newContract });
  } catch (error) {
    console.error('Error renewing contract:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete contract
router.delete('/:id', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const contract = await Contract.findByIdAndDelete(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    res.json({ success: true, message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;