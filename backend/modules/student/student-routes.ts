import { Router } from 'express';
import { studentController } from '../../controllers/student-controller';
import { rules, validate } from '../../middleware/validate';
import { requireStudent, requireAuth, authenticate } from '../../middleware/auth-middleware';
import { attachTenantContext } from '../../middleware/tenant-middleware';

const router = Router();

router.use(attachTenantContext);

// Auth (public)
router.post('/register', rules.studentRegister, validate, studentController.register);
router.post('/login', rules.studentLogin, validate, studentController.login);

// Protected
router.get('/profile', ...requireStudent, studentController.getProfile);
router.put('/profile', ...requireStudent, rules.studentProfileUpdate, validate, studentController.updateProfile);
router.post('/change-password', ...requireStudent, studentController.changePassword);
router.get('/dashboard', ...requireStudent, studentController.getDashboard);
router.get('/history', ...requireStudent, studentController.getHistory);
router.get('/education', ...requireStudent, studentController.getEducationHistory);
router.post('/education', ...requireStudent, studentController.addEducationEntry);
router.put('/education/:id', ...requireStudent, studentController.updateEducationEntry);
router.delete('/education/:id', ...requireStudent, studentController.deleteEducationEntry);
router.get('/alumni', ...requireStudent, studentController.listAlumni);
router.get('/peers', ...requireStudent, studentController.listAlumni);
router.get('/:id', ...requireAuth, studentController.getProfile);

export default router;
