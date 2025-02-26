import { db } from "./index";
import { 
  users,
  permissions,
  systemSettings,
  userSettings,
  userPermissions
} from "./schema";
import * as argon2 from "argon2";

async function seedSettings() {
  // Seed initial admin user
  const [adminUser] = await db.insert(users).values({
    email: "admin@facto.com",
    name: "System Admin",
    hashedPassword: await argon2.hash("admin123"), // This should be changed after first login
    role: "admin",
    department: "Administration",
    isActive: true,
  }).returning();

  // Seed permissions
  const permissionsList = [
    // User Management
    { name: "user.create", description: "Can create new users", category: "user_management" },
    { name: "user.edit", description: "Can edit user details", category: "user_management" },
    { name: "user.delete", description: "Can delete users", category: "user_management" },
    { name: "user.view", description: "Can view user details", category: "user_management" },
    
    // Production Settings
    { name: "settings.production.edit", description: "Can edit production settings", category: "production" },
    { name: "settings.production.view", description: "Can view production settings", category: "production" },
    
    // System Settings
    { name: "settings.system.edit", description: "Can edit system settings", category: "system" },
    { name: "settings.system.view", description: "Can view system settings", category: "system" },
    
    // Reports
    { name: "reports.generate", description: "Can generate reports", category: "reports" },
    { name: "reports.view", description: "Can view reports", category: "reports" },
  ];

  const seededPermissions = await db.insert(permissions).values(permissionsList).returning();

  // Grant all permissions to admin
  await db.insert(userPermissions).values(
    seededPermissions.map(permission => ({
      userId: adminUser.id,
      permissionId: permission.id,
      grantedBy: adminUser.id,
    }))
  );

  // Seed system settings
  const systemSettingsList = [
    {
      key: "production.quality_thresholds",
      value: {
        cutting: { tolerance: 0.5, minSegmentHeight: 20 },
        grinding: { roughness: 1.5, waterFlow: 15 },
        polishing: { glossLevel: 85, pressure: 3.5 },
        epoxy: { coverage: 95, thickness: 2 }
      },
      category: "production",
      description: "Quality control thresholds for production stages",
      lastModifiedBy: adminUser.id,
    },
    {
      key: "notifications.defaults",
      value: {
        productionAlerts: true,
        qualityChecks: true,
        maintenanceReminders: true,
        inventoryAlerts: true
      },
      category: "notifications",
      description: "Default notification settings",
      lastModifiedBy: adminUser.id,
    },
    {
      key: "system.maintenance",
      value: {
        backupSchedule: "0 0 * * *",
        dataRetentionDays: 365,
        maintenanceWindow: "Sunday 00:00-04:00"
      },
      category: "system",
      description: "System maintenance settings",
      lastModifiedBy: adminUser.id,
    }
  ];

  await db.insert(systemSettings).values(systemSettingsList);

  // Create default settings for admin user
  await db.insert(userSettings).values({
    userId: adminUser.id,
    theme: "system",
    notifications: {
      email: true,
      push: true,
      productionAlerts: true,
      qualityChecks: true,
      maintenanceReminders: true
    },
    defaultView: "dashboard",
    preferences: {
      language: "en",
      timezone: "UTC",
      dateFormat: "DD/MM/YYYY"
    }
  });

  console.log("Settings seed data inserted successfully");
}

seedSettings().catch(console.error);
