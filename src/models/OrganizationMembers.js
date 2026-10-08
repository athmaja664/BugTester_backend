const con=require('../config/db')

const createOrganizationsMembersTable=async()=>{
    await con.query(`
        CREATE TABLE IF NOT EXISTS organizations(
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
        )`
    )
    console.log('organization members table ready');
    
}
module.exports=createOrganizationsMembersTable