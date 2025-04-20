const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const registerUser =async (req,res)=>{
  try {
  const { username, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email already exists' });
  }
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = new User({
    username,
    email,
    password_hash: passwordHash,
  });
  await newUser.save();

  const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
  res.status(201).json({ token ,
      user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
      }

  });
}
catch(err){
  console.error(err);
  res.status(500).json({ message: 'Problem server error' });

}
}

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
  
    // Rechercher l'utilisateur par e-mail dans la base de données
    const user = await User.findOne({ email });
    // Vérifier si l'utilisateur existe
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    // Vérifier si le mot de passe est correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    // Générer un token JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const getUserProfile = async (req,res)=>{
  try{
      const user = await User.findById(req.params.user_id)
      if(!user){
          return res.status(404).json({ message: 'User not found' });
      }
      res.json({
          user: {
              id: user._id,
              username: user.username,
              email: user.email,
          }
      });
  }
  catch(err){
      console.error(err);
      res.status(500).json({ message: 'Problem server error' });

  }
};

const updateUserProfile = async (req, res) => {
  try {
      // On récupère l'ID de l'utilisateur depuis l'URL (ex: /users/123)
      const { user_id } = req.params;
      // On récupère les nouvelles données à mettre à jour depuis le corps de la requête
      const updateData = req.body;

      // Si quelqu'un essaie de changer son mot de passe ici, on refuse
      if (updateData.password) {
      return res.status(400).json({
        message: 'Utilisez le point de terminaison "réinitialisation du mot de passe" pour changer le mot de passe'
      });
    }

      // On cherche l'utilisateur par son ID et on met à jour ses données
      const updatedUser = await User.findByIdAndUpdate(
          user_id,       // L'ID de l'utilisateur à mettre à jour
          updateData,    // Les nouvelles données (par exemple : nom, email, etc.)
          {
            new: true,            // On retourne le nouvel objet mis à jour (et pas l'ancien)
            runValidators: true   // On vérifie que les nouvelles données sont valides
          }
      ).select('-password_hash -__v'); // On enlève le mot de passe et la version interne de la réponse
  
      if (!updatedUser) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.json(updatedUser);
  } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: 'Server error updating profile' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile
};