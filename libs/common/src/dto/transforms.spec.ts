import 'reflect-metadata';
import { plainToInstance, Transform } from 'class-transformer';
import { toBoolean } from './transforms';

class Query {
  @Transform(toBoolean)
  flag?: boolean;
}

describe('toBoolean', () => {
  it('reads query strings before implicit conversion turns "false" into true', () => {
    const parse = (flag: unknown) => plainToInstance(Query, { flag }, { enableImplicitConversion: true }).flag;
    expect(parse('false')).toBe(false);
    expect(parse('true')).toBe(true);
    expect(parse(false)).toBe(false);
    expect(parse(undefined)).toBeUndefined();
  });
});
