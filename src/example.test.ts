import { Entity, ManyToOne, MikroORM, PrimaryKey, Property } from '@mikro-orm/sqlite';

@Entity()
class User {

  @PrimaryKey()
  id!: number;

  @Property()
  firstName: string;

  @Property()
  lastName: string;

  @Property({ persist: false })
  get initials(): string {
    return (this.firstName[0] || '') + (this.lastName[0] || '');
  }

  constructor(lastName: string, firstName: string) {
    this.lastName = lastName;
    this.firstName = firstName;
  }
}

@Entity()
class Notification {

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User)
  recipient: User;

  constructor(user: User) {
    this.recipient = user;
  }
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [User, Notification],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test('transactional fail on getter property', async () => {
  const user1 = new User('Bar', 'Foo');
  await orm.em.persistAndFlush(user1);
  orm.em.clear();

  const notification = new Notification(user1);
  await orm.em.persistAndFlush(notification);
  orm.em.clear();

  const fetchedNotification = await orm.em.findOneOrFail(Notification, { id: notification.id });
  await orm.em.transactional(async () => {
    // ... do anything, this will fail
  })
});

test('transactional success on getter property', async () => {
  const user1 = new User('Bar', 'Foo');
  await orm.em.persistAndFlush(user1);
  orm.em.clear();

  const notification = new Notification(user1);
  await orm.em.persistAndFlush(notification);
  orm.em.clear();

  const fetchedNotification = await orm.em.findOneOrFail(Notification, { id: notification.id }, { populate: ['recipient'] });
  await orm.em.transactional(async () => {
    // ... do anything, this will not fail
  })
});
