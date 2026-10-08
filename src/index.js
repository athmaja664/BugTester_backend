const express = require("express");
const db = require("./config/db");
const cors = require("cors");

const createUsersTable = require("./models/Users");
const createProjectsTable = require("./models/Projects");
const createBugsTable = require("./models/Bugs");
const ProjectMembers=require('./models/ProjectMembers');
const ActivityLog=require('./models/ActivityLogs');
// const createProjectMembersTable =require('./models/ProjectMembers')
const createOrganizationsTable = require("./models/Organization");
const router = require("./routes/route");
const createSuperAdminTable = require("./models/SuperAdmins");
const createOrganizationsMembersTable = require("./models/OrganizationMembers");
async function createTables() {
    await createUsersTable();
    await createProjectsTable();
    await createBugsTable();
    await ProjectMembers();
    await ActivityLog();
    await createOrganizationsTable();
    await createSuperAdminTable();
    await createOrganizationsMembersTable();
    // await createProjectMembersTable();
}

createTables().catch(console.error);

const bugTesterServer = express();

bugTesterServer.use(cors());
bugTesterServer.use(express.json());

bugTesterServer.use(router);

bugTesterServer.get("/", (req, res) => {
  res.json({
    message: "BugTester backend is running",
  });
});

const PORT = process.env.PORT || 5000;

bugTesterServer.listen(PORT, () => {
    console.log(`BugTester server started on port ${PORT}`);
});