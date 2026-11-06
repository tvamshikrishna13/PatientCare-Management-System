# PatientCare – Patient Management System

A modern patient management website built with HTML, CSS, JavaScript, Node.js, Express and MySQL.

## Features
- Dashboard with patient statistics and recent patient records
- Patient registration, listing, search, filtering and details
- Edit and delete patient records
- Responsive healthcare-inspired interface
- Form validation and confirmation before deletion
- MySQL connection configured through environment variables

## Database
This project is configured for:
- Schema: `patient_management`
- Table: `patients`
- Columns: `patient_id`, `name`, `phone_number`, `gender`, `age`, `problem`

If you already created this table in MySQL Workbench, keep it. Do not run the CREATE TABLE statement again. Check its columns using `DESCRIBE patients;`.

## Setup
1. Install Node.js.
2. Open this folder in VS Code.
3. Create a `.env` file by copying `.env.example`.
4. Enter your local MySQL credentials in `.env`.
5. In the terminal, run `npm install`.
6. Run `npm start`.
7. Open `http://localhost:3000`.

## Environment variables
`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` and `PORT` are loaded from `.env`. Never commit `.env` to GitHub.

## Notes
- The website expects the existing MySQL table to use the column names above.
- `patient_id` should be a primary key. AUTO_INCREMENT is recommended for adding new records.
- This is a college-project starter. Add authentication, role permissions, audit logs and deployment security before using real patient data.
- Use fictional sample patient records for demos. Do not upload real patient health information to a public repository.