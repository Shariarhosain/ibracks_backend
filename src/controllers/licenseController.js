import licenseService from '../services/licenseService.js';

const licenseController = {
  /**
   * Handle request to create a new license pack.
   */
  async createPack(req, res, next) {
    try {
      // Basic validation
      const { name, price, description, features } = req.body;
      if (!name || typeof price !== 'number' || !description || !Array.isArray(features)) {
        return res.status(400).json({ success: false, message: 'Missing or invalid required fields.' });
      }

      const licensePack = await licenseService.createLicensePack(req.body);
      res.status(201).json({
        success: true,
        message: 'License pack created successfully',
        data: licensePack,
      });
    } catch (error) {
      next(error); // Pass error to the global error handler
    }
  },

  /**
   * Handle request to get all license packs.
   */
  async getAllPacks(req, res, next) {
    try {
      const licensePacks = await licenseService.getAllLicensePacks();
      res.status(200).json({
        success: true,
        count: licensePacks.length,
        data: licensePacks,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Handle request to get a single license pack by ID.
   */
  async getPackById(req, res, next) {
    try {
      const { id } = req.params;
      const licensePack = await licenseService.getLicensePackById(id);
      res.status(200).json({
        success: true,
        data: licensePack,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Handle request to update a license pack.
   */
  async updatePack(req, res, next) {
    try {
      const { id } = req.params;
      const updatedLicensePack = await licenseService.updateLicensePack(id, req.body);
      res.status(200).json({
        success: true,
        message: 'License pack updated successfully',
        data: updatedLicensePack,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Handle request to delete a license pack.
   */
  async deletePack(req, res, next) {
    try {
      const { id } = req.params;
      await licenseService.deleteLicensePack(id);
      // Send a 200 OK with a success message instead of 204 No Content to provide confirmation
      res.status(200).json({
        success: true,
        message: 'License pack deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

export default licenseController;
