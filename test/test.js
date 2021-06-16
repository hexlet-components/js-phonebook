// @flow

import querystring from 'querystring';

import axios from 'axios';
import debug from 'debug';
import makeServer from '../src/server';

const log = debug('hexlet-phonebook');
const hostname = 'localhost';
const port = 9000;
const url = `http://${hostname}:${port}`;

const listenCallback = () => log(`server was started ${url}`);
const closeCallback = () => log('server was stopped');

const users = {
  1: { name: 'Chelsie Eichmann', phone: '1-466-807-1978' },
  2: { name: 'Miss Ewald Dickinson', phone: '699-653-9379' },
  3: { name: 'Mauricio Cassin', phone: '(683) 115-8139' },
  4: { name: 'Liam Wiegand', phone: '1-327-988-3382' },
  5: { name: 'Lonny McGlynn', phone: '(935) 384-0149' },
  6: { name: 'Dr. Faustino Bailey', phone: '746-901-8330' },
  7: { name: 'Audrey Renner Sr.', phone: '(315) 168-5651' },
  8: { name: 'Odie Hettinger', phone: '498.168.4492' },
  9: { name: 'Mrs. Marlee Lesch', phone: '(412) 979-7311' },
};

const server = makeServer(log, users);

describe('Phonebook', () => {
  beforeAll(() => server.listen(port, listenCallback));

  it('should work', async () => {
    const res = await axios.get(url);
    expect(res.status).toBe(200);
    expect(res.data).toEqual('Welcome to The Phonebook\nRecords count: 9');
  });

  it('should work 2', async () => {
    const res = await axios.get(`${url}/asdf`, { validateStatus: () => true });
    expect(res.status).toBe(404);
  });

  it('/users.json', async () => {
    const result = {
      meta: { page: 1, perPage: '3', totalPages: 3 },
      data: [
        { name: 'Chelsie Eichmann', phone: '1-466-807-1978' },
        { name: 'Miss Ewald Dickinson', phone: '699-653-9379' },
        { name: 'Mauricio Cassin', phone: '(683) 115-8139' },
      ],
    };

    const query = querystring.stringify({ perPage: 3 });
    const res = await axios.get(`${url}/users.json?${query}`);
    expect(res.status).toBe(200);
    expect(res.data).toEqual(result);
  });

  it('/users.json?perPage&page', async () => {
    const result = {
      meta: { page: '3', perPage: '4', totalPages: 3 },
      data: [
        { name: 'Mrs. Marlee Lesch', phone: '(412) 979-7311' },
      ],
    };

    const query = querystring.stringify({ perPage: 4, page: 3 });
    const res = await axios.get(`${url}/users.json?${query}`);
    expect(res.status).toBe(200);
    expect(res.data).toEqual(result);
  });

  it('/search.json', async () => {
    const result = {
      data: [
        { name: 'Chelsie Eichmann', phone: '1-466-807-1978' },
        { name: 'Mauricio Cassin', phone: '(683) 115-8139' },
        { name: 'Mrs. Marlee Lesch', phone: '(412) 979-7311' },
      ],
    };

    const query = querystring.stringify({ q: 'mA' });
    const res = await axios.get(`${url}/search.json?${query}`);
    expect(res.status).toBe(200);
    expect(res.data).toEqual(result);
  });

  it('POST /users.json', async () => {
    const result = {
      data: {
        id: 10,
        name: 'Tom',
        phone: '1234-234-234',
      },
      meta: {
        location: '/users/10.json',
      },
    };

    const data = {
      name: 'Tom',
      phone: '1234-234-234',
    };
    const res = await axios.post(`${url}/users.json`, data);
    expect(res.status).toBe(201);
    expect(res.data).toEqual(result);

    const res2 = await axios.get(`${url}/users/10.json`);
    expect(res2.status).toBe(200);
    expect(res2.data).toEqual({ data });
  });

  it('POST /users.json (with errors)', async () => {
    const result = {
      errors: [
        {
          source: 'name',
          title: 'bad format',
        },
        {
          source: 'phone',
          title: "can't be blank",
        },
      ],
    };

    const data = {
      name: '$Tom',
      phone: '',
    };
    const res = await axios.post(`${url}/users.json`, data, { validateStatus: () => true });
    expect(res.status).toBe(422);
    expect(res.data).toEqual(result);
  });

  it('/users/<id>', async () => {
    const result = {
      data: {
        name: 'Mrs. Marlee Lesch',
        phone: '(412) 979-7311',
      },
    };

    const res = await axios.get(`${url}/users/9.json`);
    expect(res.status).toBe(200);
    expect(res.data).toEqual(result);
  });

  it('/users/<undefined>', async () => {
    const res = await axios.get(`${url}/users/100.json`, { validateStatus: () => true });
    expect(res.status).toBe(404);
  });

  afterAll(() => server.close(closeCallback));
});
