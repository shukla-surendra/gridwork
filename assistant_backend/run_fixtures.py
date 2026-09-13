import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from adapters.orm.models.base import Base
import adapters.orm.models.pg_models  # noqa: F401 -- registers every model on Base.metadata before create_all()
from adapters.orm.fixtures import create_fixtures

def main():
    # Get database URL from environment variable or use default.
    # 'productify' matches the docker-compose db's POSTGRES_DB -- the old
    # default here ('assistant_db') never matched any database this app
    # actually creates.
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/productify')

    try:
        # Create engine and session
        engine = create_engine(database_url)
        Session = sessionmaker(bind=engine)
        session = Session()

        # Create tables if they don't exist
        Base.metadata.create_all(engine)

        # Run fixtures
        print("Creating fixtures...")
        fixtures = create_fixtures(session)

        # Print summary -- one line per model create_fixtures() covers
        print("\nFixtures created successfully:")
        print(f"- Users: {len(fixtures['users'])}")
        print(f"- User Settings: {len(fixtures['user_settings'])}")
        print(f"- Workspace: 1")
        # BoardItem is a dead, unused model -- board cards are plain Tasks
        # with board_id set (see fixtures.py) -- this used to reference a
        # 'board_items' key that create_fixtures() has never returned,
        # crashing the summary print after every successful seed.
        print(f"- Boards: 2")
        print(f"- Tags: {len(fixtures['tags'])}")
        print(f"- Tasks: {len(fixtures['tasks'])}")
        print(f"- Comments: {len(fixtures['comments'])}")
        print(f"- Reminders: {len(fixtures['reminders'])}")
        print(f"- Notifications: {len(fixtures['notifications'])}")
        print(f"- Page: 1 ({len(fixtures['blocks'])} blocks)")
        print(f"- Database: 1 ({len(fixtures['database_entries'])} entries)")
        print(f"- Templates: {len(fixtures['templates'])}")
        print(f"- Activities: {len(fixtures['activities'])}")
        print(f"- Integrations: {len(fixtures['integrations'])}")
        print(f"- CRM Companies: {len(fixtures['companies'])}")
        print(f"- CRM Contacts: {len(fixtures['contacts'])}")
        print(f"- CRM Deals: {len(fixtures['deals'])}")
        print(f"- CRM Contact Activities: {len(fixtures['contact_activities'])}")
        print(f"- CRM Deal Activities: {len(fixtures['deal_activities'])}")
        print(f"- CRM Leads: {len(fixtures['leads'])}")
        print(f"- CRM Lead Activities: {len(fixtures['lead_activities'])}")
        print(f"- Sprints: {len(fixtures['sprints'])}")
        print(f"- Billing Customers: {len(fixtures['bill_customers'])}")
        print(f"- Billing Items: {len(fixtures['bill_items'])}")
        print(f"- Billing Quotes: {len(fixtures['bill_quotes'])}")
        print(f"- Billing Invoices: {len(fixtures['bill_invoices'])}")
        print(f"- Billing Payments: {len(fixtures['bill_payments'])}")
        print(f"- School Teachers: {len(fixtures['teachers'])}")
        print(f"- School Classes: {len(fixtures['school_classes'])}")
        print(f"- School Students: {len(fixtures['students'])}")
        print(f"- Library Seats: {len(fixtures['lib_seats'])}")
        print(f"- Library Members: {len(fixtures['lib_members'])}")
        print(f"- Library Bookings: {len(fixtures['lib_bookings'])}")
        print(f"- Chat: 1 ({len(fixtures['chat_messages'])} messages)")

        # Print user credentials
        print("\nTest User Credentials:")
        for user in fixtures['users']:
            print(f"- Email: {user.email}")
            print(f"  Role: {user.role}")
            print(f"  User Type: {user.user_type}")

    except Exception as e:
        print(f"Error creating fixtures: {str(e)}")
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    main() 