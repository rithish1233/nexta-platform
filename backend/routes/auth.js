const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const { User } = require('../models');
const { protect } = require('../middleware/auth');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, domain } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already registered' });
    const user = await User.create({ name, email, password, role, domain });
    res.status(201).json({ token: sign(user._id), user: user.toSafeObject() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: sign(user._id), user: user.toSafeObject() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', protect, (req, res) => res.json({ user: req.user }));

module.exports = router;
