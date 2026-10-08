const con=require('../config/db')

const createSuperAdminTable=async()=>{
    await con.query(`
        CREATE TABLE IF NOT EXISTS organizations(
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
        )`
    )
    console.log('SuperAdmin table ready');
    
}
module.exports=createSuperAdminTable