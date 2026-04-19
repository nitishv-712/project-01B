"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_PRESETS = exports.ALL_PERMISSIONS = void 0;
exports.ALL_PERMISSIONS = [
    'courses:read',
    'courses:create',
    'courses:update',
    'courses:delete',
    'users:read',
    'users:update',
    'users:delete',
    'testimonials:read',
    'testimonials:create',
    'testimonials:update',
    'testimonials:delete',
    'orders:read',
    'stats:read',
    'stats:update',
    'media:upload',
    'media:delete',
    'profile:manage_own',
];
// Preset permission bundles for convenience
exports.PERMISSION_PRESETS = {
    full_admin: exports.ALL_PERMISSIONS,
    course_manager: ['courses:read', 'courses:create', 'courses:update', 'courses:delete', 'media:upload', 'media:delete', 'profile:manage_own'],
    content_editor: ['courses:read', 'courses:update', 'testimonials:read', 'testimonials:create', 'testimonials:update', 'testimonials:delete', 'media:upload', 'profile:manage_own'],
    user_manager: ['users:read', 'users:update', 'users:delete', 'orders:read', 'profile:manage_own'],
    viewer: ['courses:read', 'users:read', 'testimonials:read', 'orders:read', 'stats:read', 'profile:manage_own'],
};
