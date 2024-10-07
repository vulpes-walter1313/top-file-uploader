This project is my attempt at [the odin project's File Uploader Project](https://www.theodinproject.com/lessons/nodejs-file-uploader)

# models

## user

```sql
CREATE TABLE IF NOT EXISTS users (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	first_name VARCHAR(30) NOT NULL,
	last_name VARCHAR(30) NOT NULL,
	email VARCHAR(356) NOT NULL UNIQUE,
	password TEXT,
	is_admin BOOLEAN
);
```

## Folders

```sql
CREATE TABLE IF NOT EXISTS folders (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(50) NOT NULL,
	description VARCHAR(256),
	created_by uuid NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY(created_by)
		REFERENCES users(id)
		ON DELETE CASCADE
		ON UPDATE CASCADE
);
```

## Files

```sql
CREATE TABLE IF NOT EXISTS files (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	file_url TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	description VARCHAR(256),
	ext_name VARCHAR(20) NOT NULL,
	file_type VARCHAR(20) NOT NULL,
	size BIGINT NOT NULL,
	created_by uuid NOT NULL,
	in_folder uuid NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (created_by)
		REFERENCES users(id)
		ON DELETE CASCADE
		ON UPDATE CASCADE,
	FOREIGN KEY (in_folder)
		REFERENCES folders(id)
		ON DELETE CASCADE
		ON UPDATE CASCADE
);
```

## Folder Shares

```sql
CREATE TABLE IF NOT EXISTS shares (
	id uuid PRIMARY KEY gen_random_uuid(),
	folder_id uuid NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL,
	created_by uuid NOT NULL,
	FOREIGN KEY (folder_id)
		REFERENCES folders(id)
		ON DELETE CASCADE
		ON UPDATE CASCADE,
	FOREIGN KEY (created_by)
		REFERENCES users(id)
		ON DELETE CASCADE
		ON UPDATE CASCADE
);
```

# Routes

The routes will be the following:

1. GET `/`
2. GET `/signup`
3. POST `/signup`
4. GET `/login`
5. POST `/login`
6. GET `/logout`
7. GET `/dashboard`
8. GET `/folders`
9. GET `/folders/create`
10. GET `/folders/:folderId`
11. POST `/folders/:folderId`
12. GET `/folders/:folderId/upload`
13. POST `/folders/:folderId/upload`
14. GET `/folders/:folderId/update`
15. POST `/folders/:folderId/update`
16. GET `/folders/:folderId/delete`
17. POST `/folders/:folderId/delete`
18. GET `/folders/:folderId/share`
19. POST `/folders/:folderId/share`
20. GET `/files`
21. GET `/files/upload`
22. POST `/files/upload`
23. GET `/files/:fileId`
24. GET `/files/:fileId/update`
25. POST `/files/:fileId/update`
26. GET `/files/:fileId/delete`
27. POST `/files/:fileId/delete`
28. GET `/shares/:shareId`
29. GET `/shares/:shareId/download/:fileId`
30. GET `/my-shares`
31. POST `/my-shares/:shareId/delete`
32. GET `/account`
33. POST `/account/info`
34. POST `/account/email`
35. POST `/account/password`

## GET `/` homepage

This homepage will be a welcome screen to tell them about the product and redirect them to either GET `/signup` or GET `/login`.

## GET `/signup`

This will show a register page that has a form to accept:

- first_name
- last_name
- email
- password
- confirm_password

## POST `/signup`

This route will validate all data and create user if successful. On success, user will be redirected to GET `/login`.

## GET `/login`

This page will have a form to login with email and password.

## POST `/login`

This is a route that will call passport authenticate and on success will redirect to GET `/dashboard`

## GET `/logout`

This route will destroy the session and redirect user to `/` homepage

## GET `/dashboard`

Page attributes:

- Must be logged in

This page will be a dashboard for all the users files and folders. There should also be links to create a folder and to upload files.

### Essential Features

1. Link to create a folder
2. Link to upload file
3. display table of folders
   1. have a small table with link to see all folders
4. display table of files
   1. have small table with link to see all files
5. Show active shares link in sidebar

## GET `/folders`

Page attributes:

- Must be logged in

This page will show all folders a user has. This means this page will need pagination. This page will display a list of folders owned by the curent user.

### Query Params

- **page**: This will display the page being seen
- **limit**: adds a limit to how many folders are seen at once
- **q**: search query param for name of folder

### Essential Features

- Display folders
- Search feature for folder name
- Pagination options
- Link to create a new folder

## GET `/folders/create`

Page attributes:

- Must be logged in

This page will be a simple form page to create a new folder. The form should have the following:

- name
- description

## POST `/folders/create`

Route attributes:

- Must be logged in
- Data validation

This route will handle the folder creation if logged in and data is valid. On success it should redirect to GET `/folders/:folderId`. On failure, it should rerender GET `/folders/create` with validation error message.

## GET `/folders/:folderId`

Page Attribute:

- Must be logged in
- must be owner of folder or admin

This page will show all the details of the folder, and include any files in it if any. it should allow to add files, edit files, or delete files.

If user wants to add a file, it should redirect to GET `/folders/:folderId/upload`. If user wants to edit a file, that should be redirected to GET `/files/:fileId/update`, If the user wants to delete a file, that should redirect to GET `/files/:fileId/delete`

## GET `/folders/:folderId/upload`

Page attributes:

- must be logged in
- must own folder or be admin

This page will be a special upload page where the file upload is specifically added to the `:folderId` folder. it saves files with the name that the file is named after. The file names can be edited later in `/files/:fileId/update`

The html form will have the following inputs

- file (multiple)

## POST `/folders/:folderId/upload`

Route attributes:

- Must be logged in
- must own folder or be admin

This route will process the uploads. On success, it should redirect to GET `/folders/:folderId`. On failure, it should rerender GET `/folders/:folderId/upload`.

## GET `/folders/:folderId/update`

Page Attributes:

- Must be logged in
- must own folder or be admin

This page is similar to `/folders/create`, as it will be a form that will auto populate the information from folder that is editable and will allow edits.

Form should have the following:

- name
- description

## Post `/folders/:folderId/update`

Route atributes:

- Must be logged in
- must own folder or be admin

This route will process the edits to the folder name and description. On success, it will redirect to GET `/folders/:folderId`. On failure, it will rerender GET `/folders/:folderId/update`.

## GET `/folders/:folderId/delete`

Page attributes:

- Must be logged in
- must own folder or be admin

This page will be a deletion confirmation page to delete a folder and all it's contents. The page should have a clear warning when there are files in the folder. It should also notify if there are active shares of that folder.

## POST `/folders/:folderId/delete`

Route attributes

- must be logged in
- must own folder or be admin

This route will delete the folder, the active shares, and the files inside the folder. On success, it will redirect to GET `/dashboard`. It would be strange if this would fail after verifying that the current user has the authority to delete a folder.

## GET `/folders/:folderId/share`

Page Attributes:

- must be logged in
- must be owner or be admin

This page will have a form that sets up the the share duration.

### Form Inputs

- expires_in (Select)
  - 15m
  - 1h
  - 6h
  - 1d
  - 5d
  - 1w
  - 2w
  - 1mo

## POST `/folders/:folderId/share`

Route Attributes:

- must be logged in
- must be owner or be admin

This route verifies permissions and on success, will create a folder share for that duration of time, and redirect to `/my-shares/:shareId`.

## GET `/files`

Page attributes:

- must be logged in

This page will be a like `/folders`, in that it will have a big list display of all the files the user has uploaded. this page will have pagination.

### Query Params

- **page**: This will display the page being seen
- **limit**: adds a limit to how many folders are seen at once
- **q**: search query param for name of folder

## GET `/files/:fileId`

Page attributes:

- Must be logged in
- must own file or be admin

This Page will display the information of the file, such as:

- name
- size
- filetype

There should be options to download, edit the file, or delete the file.

## GET `/files/:fileId/update`

Page attributes:

- must be logged in
- must own file or be admin

This page will have a form that allows the user to edit two fields

- name
- description

The form should auto populate if content exists. The `name` refers to the file name that is displayed in the app. this is usually gotten from the file uploaded. The `name` is not the physical name in the coud storage. that can be found in the `file_url` column in the DB.

## POST `/files/:fileId/update`

Route attributes:

- must be logged in
- must own file or be admin

This route will edit the file record. On success, it will redirect to GET `/files/:fileId`. On failure, it will rerender GET `/files/:fileId/update`.

## GET `/files/:fileId/delete`

Page attributes:

- Must be logged in
- must be owner or be admin

This page is basically a delete confirmation page. It will have the basic information of the file, such as name, description, file size, file type, created at, and updated at.

## POST `/files/:fileId/delete`

Route attributes:

- must be logged in
- must be owner or admin

This route will delete the file from cloud storage and the record from the database. Once a file is deleted, it won't be accessible frm the folder, which includes the active shared folders.

## GET `/shares/:shareId`

Page attribute:

- accessible to everyone

This page has all the files from the folder being shared and can let the user download each file individually. If we can do it in a reasonable time, i want to see if we can implement a "download all" button to download all files as a zip.

## GET `/shares/:shareId/download/:fileId`

This route will verify:

- That the share is active
- that the file requested lives inside the share
- sendFile if everything is okay
- return 404 if share is not active
- return 403 if file is not in share

Because this route could lead to a blank page, the route should be given a callback url to go back to the previous page.

## GET `/my-shares`

Page attributes:

- must be logged in

This page shows active shares. much like `/files` and `/folders`.

## GET `/my-shares/:shareId/delete`

Page Attributes:

- must be logged in
- must be owner or be admin

This page is a delete confirmation page for the share in question.

## POST `/my-shares/:shareId/delete`

Route Attributes:

- must be logged in
- must be owner or be admin

This route will delete a share if user has permission. This does not affect the folder and files in the share. only the records in the shares DB table.

## GET `/account`

Page Attributes:

- must be logged in

This page lets the current user see their personal information and edit their name, and credentials. The page should have 3 forms for three different updates.

### Update name

- Action: `/account/info`
- Method: 'POST'
- Inputs:
  - first_name
  - last_name

### update email

- Action: `/account/email`
- Method: 'POST'
- inputs:
  - email
  - confirm_email

### update password

- Action: `/account/password`
- Method: 'POST'
- Inputs:
  - old password
  - new password
  - confirm new password
