# ── 1. Install PostgreSQL via Homebrew ───────────────────────────────────────
brew install postgresql@16
brew services start postgresql@16
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# ── 2. Create DB and user ─────────────────────────────────────────────────────
psql postgres -c "CREATE USER rentaluser WITH PASSWORD 'rentalpass';"
psql postgres -c "CREATE DATABASE rentaldb OWNER rentaluser;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE rentaldb TO rentaluser;"

# ── 3. Virtual environment ────────────────────────────────────────────────────
python3 -m venv venv
source venv/bin/activate

# ── 4. Install all dependencies ───────────────────────────────────────────────
pip install \
  django==4.2 \
  djangorestframework==3.15 \
  djangorestframework-simplejwt==5.3 \
  django-cors-headers==4.3 \
  django-storages==1.14 \
  django-filter==23.5 \
  django-environ==0.11 \
  psycopg2-binary==2.9 \
  Pillow==10.3 \
  celery==5.3 \
  redis==5.0 \
  stripe==8.5 \
  boto3==1.34 \
  dj-database-url==2.1 \
  gunicorn==21.2 \
  whitenoise==6.6

pip freeze > requirements.txt

# ── 5. Create Django project ──────────────────────────────────────────────────
django-admin startproject core .

# ── 6. Create all apps ────────────────────────────────────────────────────────
python manage.py startapp users
python manage.py startapp properties
python manage.py startapp bookings
python manage.py startapp payments
python manage.py startapp reviews
python manage.py startapp notifications
