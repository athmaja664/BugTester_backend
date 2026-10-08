const express = require('express')
const jwtMiddleware = require('../middleware/jwtMiddleware')
const superAdminMiddleware = require('../middleware/superAdminMiddleware')
const billingMiddleware=require('../middleware/billingMiddleware')
const uploadAttachments = require('../middleware/uploadMiddleware')
const UsersController = require('../controllers/UsersController')
const ProjectsController=require('../controllers/ProjectsController')
const BugsController=require('../controllers/BugsController')
const ActivityController = require('../controllers/ActivityController')
const SuperAdminController = require('../controllers/SuperAdminUserController')
const router = express.Router()

// ADMIN REGISTER
router.post('/api/adminregister', UsersController.adminRegister)
// ADMIN LOGIN
router.post('/api/login', UsersController.login)

//user
//ADD USERS
router.post('/api/createuser', jwtMiddleware, billingMiddleware,  UsersController.createUser)
// ADMIN GETS ALL USERS
router.get('/api/users', jwtMiddleware, billingMiddleware,  UsersController.getUsers)
// ADMIN GETS A SINGLE USER BY ID
router.get('/api/users/:id', jwtMiddleware, billingMiddleware,  UsersController.getUserById)
// ADMIN DELETES A USER
router.delete('/api/users/:id', jwtMiddleware, billingMiddleware,  UsersController.deleteUser)
// ADMIN UPDATES A USER
router.put('/api/users/:id', jwtMiddleware, billingMiddleware,  UsersController.updateUser)
// ADMIN RESETS A USER'S PASSWORD
router.put('/api/users/:id/reset-password', jwtMiddleware, billingMiddleware,  UsersController.resetUserPassword)

//profile
// GET MY OWN PROFILE
router.get('/api/my-profile', jwtMiddleware, UsersController.getMyProfile)
// UPDATE MY OWN PROFILE
router.put('/api/my-profile', jwtMiddleware, billingMiddleware, UsersController.updateMyProfile)
// CHANGE MY OWN PASSWORD
router.put('/api/change-password', jwtMiddleware, UsersController.changeMyPassword)
// CREATE PROJECT
router.post('/api/projects', jwtMiddleware, billingMiddleware, ProjectsController.createProject)
// GET ALL PROJECTS
router.get('/api/projects', jwtMiddleware, billingMiddleware,  ProjectsController.getProjects)
// GET SINGLE PROJECT
router.get('/api/projects/:id', jwtMiddleware, billingMiddleware,  ProjectsController.getProjectById)
// UPDATE PROJECT
router.put('/api/projects/:id', jwtMiddleware, billingMiddleware,  ProjectsController.updateProject)
// DELETE PROJECT
router.delete('/api/projects/:id', jwtMiddleware, billingMiddleware,  ProjectsController.deleteProject)
router.put('/api/projects/:id/members', jwtMiddleware, billingMiddleware, ProjectsController.updateProjectMembers)
router.get('/api/my-projects', jwtMiddleware, ProjectsController.getMyProjects)
// ADMIN DASHBOARD STATS
router.get('/api/admin-stats', jwtMiddleware, ProjectsController.getAdminStats)
// GET MY RECENT ACTIVITY
router.get('/api/my-activity', jwtMiddleware, ActivityController.getRecentActivity)

//bugs
// CREATE BUG
router.post('/api/bugs', jwtMiddleware, billingMiddleware,  uploadAttachments, BugsController.createBug)
// GET MY ISSUES
router.get('/api/my-issues', jwtMiddleware, billingMiddleware,  BugsController.getMyIssues)
// GET ALL BUGS (role-based)
router.get('/api/bugs', jwtMiddleware, billingMiddleware,  BugsController.getBugs)
// GET SINGLE BUG
router.get('/api/bugs/:id', jwtMiddleware, billingMiddleware,  BugsController.getBugById)
// UPDATE BUG
router.put('/api/bugs/:id', jwtMiddleware, billingMiddleware,  BugsController.updateBug)
// DELETE BUG
router.delete('/api/bugs/:id', jwtMiddleware, billingMiddleware,  BugsController.deleteBug)

// superAdmin
//superAdmin-login
router.post('/api/superadmin/login',SuperAdminController.login)
//superadmin create orgniztion
router.post('/api/superadmin/organization',superAdminMiddleware,SuperAdminController.createOrganization)
//SUPERADAMIN GET ORGANIZATION
router.get('/api/superadmin/organization',superAdminMiddleware,SuperAdminController.getOrganizations)
//SUPERADMIN GET ORGANIZATION BY ID
router.get('/api/superadmin/organization/:id',superAdminMiddleware,SuperAdminController.getOrganizationById)
//SUPERADMIN ACTIVATE DEACTIVATE
router.put('/api/superadmin/organization/:id/billing-status', superAdminMiddleware, SuperAdminController.updateBillingStatus)


//
router.get('/api/my-projects', jwtMiddleware, ProjectsController.getMyProjects)
module.exports = router