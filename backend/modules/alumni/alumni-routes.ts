import { Router } from 'express';
import { alumniController } from '../../controllers/alumni-controller';
import { rules, validate } from '../../middleware/validate';
import { requireAlumni, requireAuth, authenticate } from '../../middleware/auth-middleware';
import { attachTenantContext } from '../../middleware/tenant-middleware';

const router = Router();

router.use(attachTenantContext);

// Auth (public)
router.post('/register', rules.alumniRegister, validate, alumniController.register);
router.post('/login', rules.alumniLogin, validate, alumniController.login);

// Protected
router.get('/profile', ...requireAlumni, alumniController.getProfile);
router.put('/profile', ...requireAlumni, rules.alumniProfileUpdate, validate, alumniController.updateProfile);
router.patch('/profile', ...requireAlumni, rules.alumniProfileUpdate, validate, alumniController.updateProfile);
router.get('/dashboard', ...requireAlumni, alumniController.getDashboard);
router.get('/career-timeline', ...requireAlumni, alumniController.getCareerTimeline);
router.post('/career-timeline', ...requireAlumni, alumniController.addCareerEntry);
router.get('/education', ...requireAlumni, alumniController.getEducationHistory);
router.post('/education', ...requireAlumni, alumniController.addEducationEntry);
router.put('/education/:id', ...requireAlumni, alumniController.updateEducationEntry);
router.delete('/education/:id', ...requireAlumni, alumniController.deleteEducationEntry);

// Listing (any auth)
router.get('/', ...requireAuth, alumniController.listAlumni);
router.get('/filters', ...requireAuth, alumniController.getFilterOptions);
router.get('/filter-options', ...requireAuth, alumniController.getFilterOptions);
router.get('/students', ...requireAuth, alumniController.listStudents);
router.get('/peers', ...requireAuth, alumniController.listAlumni);
router.get('/:id', ...requireAuth, alumniController.getAlumniById);

export default router;
