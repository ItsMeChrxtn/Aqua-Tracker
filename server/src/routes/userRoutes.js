const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} = require('../controllers/userController');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/', listUsers);
router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/reset-password', resetUserPassword);

module.exports = router;
