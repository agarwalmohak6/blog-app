# Easy Next Steps

This app is much better now, but to make it work fully on your machine and later deploy it, do these steps.

## 1. Start the database

Easiest way:

```bash
docker-compose up -d db
```

What this does:
- Starts PostgreSQL
- Uses the database name `blogapp`
- Uses the default local password already shown in the project files

## 2. Create the backend env file

Create `backend/.env` with:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/blogapp
SECRET_KEY=replace-this-with-a-long-random-secret
```

Easy secret example command:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Copy that value into `SECRET_KEY`.

## 3. Make sure frontend env exists

Create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:8000
```

## 4. Run the backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

What to expect:
- The app will create/update local tables on startup
- API docs will be at [http://localhost:8000/docs](http://localhost:8000/docs)

## 5. Run the frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

- [http://localhost:5173](http://localhost:5173)

## 6. Test the important features

Do these in order:

1. Register a new user
2. Create a post
3. Save one post as draft
4. Open Dashboard
5. Edit a post
6. Open a post by slug
7. Open Archives
8. Open a tag page
9. Open an author profile page

## 7. To push this repo to GitHub

Right now this repo has **no remote configured**, so I could not push it yet.

Once you create an empty GitHub repo, run:

```bash
git remote add origin <your-repo-url>
git push -u origin master
```

Example:

```bash
git remote add origin https://github.com/yourname/blog-app.git
git push -u origin master
```

## 8. What is still missing for a full production app

These are the biggest remaining real-world items:

- Real image upload storage like Cloudinary, S3, or Supabase Storage
- Real email sending for password reset and notifications
- Password reset flow
- Email verification
- Production deployment
- Custom domain + HTTPS
- Backups and monitoring

## 9. Best next upgrade order

If you want to keep improving this project, do it in this order:

1. Image upload
2. Password reset
3. Email verification
4. Deploy frontend + backend
5. Add real analytics
