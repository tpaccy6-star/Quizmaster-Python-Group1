import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

# Get database name from DATABASE_URL
database_url = os.getenv('DATABASE_URL', '')
try:
    DB_NAME = database_url.split('/')[-1]
    # Clean up potential parameters
    if '?' in DB_NAME:
        DB_NAME = DB_NAME.split('?')[0]
except IndexError:
    DB_NAME = 'quiz_management_db'  # fallback

# Connection details from URL, assuming format mysql+pymysql://user:pass@host/dbname
user_part = database_url.split('//')[1].split('@')[0]
if ':' in user_part:
    DB_USER = user_part.split(':')[0]
    DB_PASSWORD = user_part.split(':')[1]
else:
    DB_USER = user_part
    DB_PASSWORD = ''

DB_HOST = database_url.split('@')[1].split('/')[0]

try:
    # Connect to the MySQL server (without specifying a database initially)
    connection = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

    with connection.cursor() as cursor:
        # Create the database if it doesn't exist
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"Database '{DB_NAME}' created or already exists.")

except pymysql.MySQLError as e:
    print(f"Error connecting to MySQL or creating database: {e}")

finally:
    if 'connection' in locals() and connection.open:
        connection.close()
