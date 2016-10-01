// @flow

import http from 'http';
import url from 'url';
import querystring from 'querystring';
import { Log } from './definitions';

import { validate } from './user';

const getParams = address => {
  const { query } = url.parse(address);
  return querystring.parse(decodeURI(query || ''));
};

const idGenerator = () => {
  let id = 9;
  return () => { id++; return id; };
};

const nextId = idGenerator();

const router = {
  GET: {
    '/': (req, res, matches, body, users) => {
      const messages = [
        'Welcome to The Phonebook',
        `Records count: ${Object.keys(users).length}`,
      ];
      res.end(messages.join('\n'));
    },
    '/users.json': (req, res, matches, body, users) => {
      res.setHeader('Content-Type', 'application/json');

      const { search = '', page = 1, perPage = 10 } = getParams(req.url);
      const normalizedSearch = search.trim().toLowerCase();
      const ids = Object.keys(users);

      if (normalizedSearch.length > 1) {
        const usersSubset = ids
          .filter(id => users[id].name.toLowerCase().includes(normalizedSearch))
          .map(id => users[id]);
        res.end(JSON.stringify({ data: usersSubset }));
      } else {
        const usersSubset = ids.slice(page * perPage - perPage, page * perPage)
          .map(id => users[id]);
        const totalPages = Math.ceil((ids.length) / perPage);
        res.end(JSON.stringify({ meta: { page, perPage, totalPages }, data: usersSubset }));
      }
    },
    '/users/(\\d+).json': (req, res, matches, body, users) => {
      const id = matches[1];
      res.setHeader('Content-Type', 'application/json');
      const user = users[id];
      if (!user) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.end(JSON.stringify({ data: user }));
    },
  },
  POST: {
    '/users.json': (req, res, matches, body, users, log) => {
      res.setHeader('Content-Type', 'application/json');
      const id = nextId();
      const data = JSON.parse(body);
      const errors = validate(data);

      if (errors.length === 0) {
        res.writeHead(201);
        users[id] = data;
        res.end(JSON.stringify({ meta: { location: `/users/${id}.json` }, data: { ...data, id } }));
      } else {
        res.writeHead(422);
        res.end(JSON.stringify({ errors }));
      }
    },
  },
};

export default (log: Log, users: {}) => http.createServer((request, response) => {
  const body = [];

  log(`request: ${request.url}`);

  request
    .on('error', err => log(err))
    .on('data', chunk => body.push(chunk.toString()))
    .on('end', () => {
      response.on('error', err => log(err));
      const routes = router[request.method];
      const result = Object.keys(routes).find(str => {
        const { pathname } = url.parse(request.url);
        if (!pathname) {
          return false;
        }
        const regexp = new RegExp(`^${str}$`);
        const matches = pathname.match(regexp);
        // log(regexp, str, matches)
        if (!matches) {
          return false;
        }

        routes[str](request, response, matches, body, users, log);
        return true;
      });

      if (!result) {
        response.writeHead(404);
        response.end();
      }
    });
});
