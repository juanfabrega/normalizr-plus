/* eslint-env jest */
import { normalize, schema } from '../';

describe('normalize', () => {
  [ 42, null, undefined, '42', () => {} ].forEach((input) => {
    it(`cannot normalize input that == ${input}`, () => {
      expect(() => normalize(input, new schema.Entity('test'))).toThrow();
    });
  });

  it('cannot normalize without a schema', () => {
    expect(() => normalize({})).toThrow();
  });

  it('normalizes entities', () => {
    const mySchema = new schema.Entity('tacos');
    const inputSchema = new schema.Array(mySchema);

    expect(normalize([ { id: 1, type: 'foo' }, { id: 2, type: 'bar' } ], inputSchema)).toMatchSnapshot();
  });

  it('normalizes nested entities', () => {
    const user = new schema.Entity('users');
    const comment = new schema.Entity('comments', {
      user: user
    });
    const article = new schema.Entity('articles', {
      author: user,
      comments: new schema.Array(comment)
    });

    const input = {
      id: '123',
      title: 'A Great Article',
      author: {
        id: '8472',
        name: 'Paul'
      },
      body: 'This article is great.',
      comments: [
        {
          id: 'comment-123-4738',
          comment: 'I like it!',
          user: {
            id: '10293',
            name: 'Jane'
          }
        }
      ]
    };
    expect(normalize(input, article)).toMatchSnapshot();
  });

  it('does not modify the original input', () => {
    const user = new schema.Entity('users');
    const article = new schema.Entity('articles', { author: user });
    const input = Object.freeze({
      id: '123',
      title: 'A Great Article',
      author: Object.freeze({
        id: '8472',
        name: 'Paul'
      })
    });
    expect(() => normalize(input, article)).not.toThrow();
  });

  it('ignores null values', () => {
    const myEntity = new schema.Entity('myentities');
    expect(normalize([ null ], [ myEntity ])).toMatchSnapshot();
    expect(normalize([ undefined ], [ myEntity ])).toMatchSnapshot();
    expect(normalize([ false ], [ myEntity ])).toMatchSnapshot();
  });

  it('can use fully custom entity classes', () => {
    class MyEntity extends schema.Entity {
      schema = {
        children: [ new schema.Entity('children') ]
      };

      getId(entity, parent, key) {
        return entity.uuid;
      }

      normalize(input, parent, key, visit, addEntity) {
        const entity = { ...input };
        Object.entries(this.schema).forEach(([ key, schema ]) => {
          entity[key] = visit(input[key], input, key, schema, addEntity);
        });
        addEntity(this, entity, parent, key);
        return {
          uuid: this.getId(entity),
          schema: this.getKey(input, parent, key)
        };
      }
    }

    const mySchema = new MyEntity('food');
    expect(normalize({
      uuid: '1234',
      name: 'tacos',
      children: [
        { id: 4, name: 'lettuce' }
      ]
    }, mySchema)).toMatchSnapshot();
  });
});