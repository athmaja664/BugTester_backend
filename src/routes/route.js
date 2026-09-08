const express = require('express')
const jwtMiddleware = require('../middleware/jwtMiddleware')
const UsersController = require('../controllers/UsersController')
const ProjectsController=require('../controllers/ProjectsController')
const BugsController=require('../controllers/BugsController')
const ActivityController = require('../controllers/ActivityController')
const router = express.Router()

// ADMIN REGISTER
router.post('/api/adminregister', UsersController.adminRegister)
// ADMIN LOGIN
router.post('/api/login', UsersController.login)
//ADD USERS
router.post('/api/createuser', jwtMiddleware, UsersController.createUser)
// ADMIN GETS ALL USERS
router.get('/api/users', jwtMiddleware, UsersController.getUsers)
// ADMIN GETS A SINGLE USER BY ID
router.get('/api/users/:id', jwtMiddleware, UsersController.getUserById)
// ADMIN DELETES A USER
router.delete('/api/users/:id', jwtMiddleware, UsersController.deleteUser)
// ADMIN UPDATES A USER
router.put('/api/users/:id', jwtMiddleware, UsersController.updateUser)
// ADMIN RESETS A USER'S PASSWORD
router.put('/api/users/:id/reset-password', jwtMiddleware, UsersController.resetUserPassword)
// GET MY OWN PROFILE
router.get('/api/my-profile', jwtMiddleware, UsersController.getMyProfile)
// UPDATE MY OWN PROFILE
router.put('/api/my-profile', jwtMiddleware, UsersController.updateMyProfile)
// CHANGE MY OWN PASSWORD
router.put('/api/change-password', jwtMiddleware, UsersController.changeMyPassword)
// CREATE PROJECT
router.post('/api/projects', jwtMiddleware, ProjectsController.createProject)
// GET ALL PROJECTS
router.get('/api/projects', jwtMiddleware, ProjectsController.getProjects)
// GET SINGLE PROJECT
router.get('/api/projects/:id', jwtMiddleware, ProjectsController.getProjectById)
// UPDATE PROJECT
router.put('/api/projects/:id', jwtMiddleware, ProjectsController.updateProject)
// DELETE PROJECT
router.delete('/api/projects/:id', jwtMiddleware, ProjectsController.deleteProject)
router.put('/api/projects/:id/members', jwtMiddleware, ProjectsController.updateProjectMembers)
router.get('/api/my-projects', jwtMiddleware, ProjectsController.getMyProjects)
// ADMIN DASHBOARD STATS
router.get('/api/admin-stats', jwtMiddleware, ProjectsController.getAdminStats)
// GET MY RECENT ACTIVITY
router.get('/api/my-activity', jwtMiddleware, ActivityController.getRecentActivity)
// CREATE BUG
router.post('/api/bugs', jwtMiddleware, BugsController.createBug)
// GET ALL BUGS (role-based)
router.get('/api/bugs', jwtMiddleware, BugsController.getBugs)
// GET SINGLE BUG
router.get('/api/bugs/:id', jwtMiddleware, BugsController.getBugById)
// UPDATE BUG
router.put('/api/bugs/:id', jwtMiddleware, BugsController.updateBug)
// DELETE BUG
router.delete('/api/bugs/:id', jwtMiddleware, BugsController.deleteBug)

module.exports = router