-- Make User.contactNumber unique (NULLs allowed; Postgres treats NULLs as distinct)
CREATE UNIQUE INDEX "user_contactNumber_key" ON "user"("contactNumber");
