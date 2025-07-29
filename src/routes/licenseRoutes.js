import { Router } from 'express';
import licenseController from '../controllers/licenseController.js';
import verifyToken from '../middlewares/verifytoken.js';

const router = Router();

// Route for creating a new license pack (admin only) and getting all packs (public)
router.route('/')
  .post(verifyToken, licenseController.createPack)
  .get(licenseController.getAllPacks);

// Routes for getting, updating, and deleting a specific license pack
router.route('/:id')
  .get(licenseController.getPackById) // Publicly viewable
  .put(verifyToken, licenseController.updatePack)
  .delete(verifyToken, licenseController.deletePack);

export default router;
