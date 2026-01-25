# TODO List for NestJS Backend Setup

## 1. Install Dependencies
- [x] Install @nestjs/mongoose, mongoose, @nestjs/jwt, @nestjs/passport, passport, passport-jwt, class-validator, class-transformer, @nestjs/swagger, bcrypt, @types/bcrypt

## 2. Set Up Mongoose with MongoDB
- [x] Create User schema with fields: name, email, password, dateOfBirth, role (enum: SUPER_ADMIN, COMPANY_ADMIN, CANDIDATE), emailVerified, createdAt, updatedAt
- [x] Configure MongoDB Atlas connection

## 3. Create Modules
- [ ] Generate AuthModule: nest g module auth
- [ ] Generate UsersModule: nest g module users
- [ ] Update app.module.ts to import AuthModule and UsersModule

## 4. Implement JWT Authentication
- [ ] Create JWT strategy and guard
- [ ] Implement access and refresh token flow
- [ ] Create auth service with login, register, refresh, logout methods

## 5. Implement DTOs and Validation
- [ ] Create DTOs for register, login, etc. with class-validator
- [ ] Implement validation pipes

## 6. Set Up RBAC Guards
- [ ] Create role-based guards for SUPER_ADMIN, COMPANY_ADMIN, CANDIDATE

## 7. Implement Auth APIs
- [ ] /register: POST with name, email, password, confirmPassword, dateOfBirth, role
- [ ] /login: POST with email, password
- [ ] /logout: POST
- [ ] /refresh: POST
- [ ] /me: GET (protected)

## 8. Add Email Verification Placeholder
- [ ] Add emailVerified field and placeholder logic in register

## 9. Set Up Swagger Documentation
- [x] Configure Swagger in main.ts
- [x] Add API documentation for endpoints

## 10. Testing and Final Setup
- [ ] Run Prisma migrations
- [ ] Test the APIs
- [ ] Ensure everything works as expected
