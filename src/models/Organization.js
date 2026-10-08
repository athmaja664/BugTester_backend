const con=require('../config/db')

const createOrganizationsTable=async()=>{
    await con.query(`
        CREATE TABLE IF NOT EXISTS organizations(
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
        )`
    )
    console.log('organization table ready');
    
}
module.exports=createOrganizationsTable