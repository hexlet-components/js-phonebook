// @flow

import http from 'http';
import url from 'url';
import querystring from 'querystring';

import { validate, nextId } from './user';

const getParams = (address) => {
  const { query } = url.parse(address);
  return querystring.parse(decodeURI(query || ''));
};

const router = {
  GET: {
    '/': (req, res, matches, body, users) => {
      const messages = [
        'Welcome to The Phonebook',
        `Records count: ${Object.keys(users).length}`,
      ];
      res.end(messages.join('\n'));
    },

    '/search.json': (req, res, matches, body, users) => {
      res.setHeader('Content-Type', 'application/json');

      const { q = '' } = getParams(req.url);
      const normalizedSearch = q.trim().toLowerCase();
      const ids = Object.keys(users);

      const usersSubset = ids
        .filter((id) => users[id].name.toLowerCase().includes(normalizedSearch))
        .map((id) => users[id]);
      res.end(JSON.stringify({ data: usersSubset }));
    },

    '/users.json': (req, res, matches, body, users) => {
      res.setHeader('Content-Type', 'application/json');

      const { page = 1, perPage = 10 } = getParams(req.url);
      const ids = Object.keys(users);

      const usersSubset = ids.slice(page * perPage - perPage, page * perPage)
        .map((id) => users[id]);
      const totalPages = Math.ceil((ids.length) / perPage);
      res.end(JSON.stringify({ meta: { page, perPage, totalPages }, data: usersSubset }));
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
    '/users.json': (req, res, matches, body, users) => {
      res.setHeader('Content-Type', 'application/json');
      const id = nextId();
      const data = JSON.parse(body);
      const errors = validate(data);

      if (errors.length === 0) {
        res.writeHead(201);
        users[id] = data; // eslint-disable-line
        res.end(JSON.stringify({ meta: { location: `/users/${id}.json` }, data: { ...data, id } }));
      } else {
        res.writeHead(422);
        res.end(JSON.stringify({ errors }));
      }
    },
  },
};

export default (log, users) => http.createServer((request, response) => {
  const body = [];

  log(`${request.method} ${request.url}`);

  request
    .on('error', (err) => log(err))
    .on('data', (chunk) => body.push(chunk.toString()))
    .on('end', () => {
      response.on('error', (err) => log(err));
      const routes = router[request.method];
      const result = Object.keys(routes).find((str) => {
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
