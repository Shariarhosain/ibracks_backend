import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();


const generateToken = (id, email, role) => {
  return jwt.sign({ id, email, role }, process.env.SECRET_CODE, {
    expiresIn: '1d' // Token valid for 1 day
  });
};

export default generateToken;