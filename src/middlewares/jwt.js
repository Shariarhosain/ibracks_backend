import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();


const generateToken = (id, email, role, rememberMe) => {
  return jwt.sign({ id, email, role, rememberMe }, process.env.SECRET_CODE, {
    expiresIn: rememberMe ? '30d' : '1d' // Token valid for 30 days if rememberMe is true
  });
};

export default generateToken;