import { PrismaClient } from "@prisma/client";
import AppError from "../utils/error.js";

const prisma = new PrismaClient();

const licenseService = {
  /**
   * Create a new license pack.
   * @param {object} data - The data for the new license pack { name, price, description, features }.
   * @returns {Promise<object>} The created license pack.
   */
  async createLicensePack(data) {
    try {
      const { name, price, description, features } = data;
      const licensePack = await prisma.licensePack.create({
        data: {
          name,
          price,
          description,
          features,
        },
      });
      return licensePack;
    } catch (error) {
      // Handle unique constraint violation for the name field
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new AppError('A license pack with this name already exists', 409);
      }
      console.error("Error creating license pack:", error);
      throw new AppError("Failed to create license pack", 500);
    }
  },

  /**
   * Get all license packs.
   * @returns {Promise<Array<object>>} A list of all license packs.
   */
  async getAllLicensePacks() {
    try {
      const licensePacks = await prisma.licensePack.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return licensePacks;
    } catch (error) {
      console.error("Error fetching license packs:", error);
      throw new AppError("Failed to fetch license packs", 500);
    }
  },

  /**
   * Get a single license pack by its ID.
   * @param {string} id - The ID of the license pack.
   * @returns {Promise<object>} The license pack.
   */
  async getLicensePackById(id) {
    try {
      const licensePack = await prisma.licensePack.findUnique({
        where: { id },
      });
      if (!licensePack) {
        throw new AppError("License pack not found", 404);
      }
      return licensePack;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error(`Error fetching license pack with ID ${id}:`, error);
      throw new AppError("Failed to fetch license pack", 500);
    }
  },

  /**
   * Update an existing license pack.
   * @param {string} id - The ID of the license pack to update.
   * @param {object} data - The data to update.
   * @returns {Promise<object>} The updated license pack.
   */
  async updateLicensePack(id, data) {
    try {
      const { name, price, description, features } = data;
      const updatedLicensePack = await prisma.licensePack.update({
        where: { id },
        data: {
          name,
          price,
          description,
          features,
        },
      });
      return updatedLicensePack;
    } catch (error) {
      // Handle record not found error
      if (error.code === 'P2025') {
        throw new AppError('License pack not found', 404);
      }
      // Handle unique constraint violation for the name field
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new AppError('A license pack with this name already exists', 409);
      }
      console.error(`Error updating license pack with ID ${id}:`, error);
      throw new AppError("Failed to update license pack", 500);
    }
  },

  /**
   * Delete a license pack.
   * @param {string} id - The ID of the license pack to delete.
   * @returns {Promise<void>}
   */
  async deleteLicensePack(id) {
    try {
      await prisma.licensePack.delete({
        where: { id },
      });
    } catch (error) {
      // Handle record not found error
      if (error.code === 'P2025') {
        throw new AppError('License pack not found', 404);
      }
      console.error(`Error deleting license pack with ID ${id}:`, error);
      throw new AppError("Failed to delete license pack", 500);
    }
  },
};

export default licenseService;
