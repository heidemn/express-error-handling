const express = require('express4');
//const express = require('express5');
const asyncHandler = require('express-async-handler');
const fetch = require('node-fetch');

async function fetchJson(...args) {
    const res = await fetch(...args);
    if (!res.ok) {
        const e = new Error(res.status + ' ' + res.statusText);
        e.res = res;
        throw e;
    }

    return res.json();
}

const app = express();
app.getAsync = function(route, handler) {
    app.get(route, asyncHandler(handler));
}

// ---------------------------------------------------------------------------

app.get('/sqrt', (req, res) => {
    const x = parseFloat(req.query.x);
    if (!(x >= 0 && x <= Number.POSITIVE_INFINITY)) {
        //res.statusCode = 400;
        //return res.send({
        //   'error': 'Non-negative number expected!'
        //});
        throw new Error('Non-negative number expected!');
    }

    res.send({
        'x': x,
        'sqrt(x)': Math.sqrt(x)
    });
});

// ---------------------------------------------------------------------------

function succeeds() {
    //return Promise.resolve('ok');
    return fetchJson('https://httpbin.org/json');
}
function fails() {
    //return Promise.reject(new Error('doh!'));
    return fetchJson('https://httpbin.org/status/404');
}

// ?err:
// Express 4: No response
// Express 5: Works
app.get('/1a', (req, res, next) => {
    const promise = req.query.err !== undefined ? fails() : succeeds();
    promise.then((message) => {
        res.send({ Message: message });
    });
});

// ?err:
// Express 4: No response
// Express 5: Works
app.get('/1b', async (req, res, next) => {
    const promise = req.query.err !== undefined ? fails() : succeeds();
    res.send({ Message: await promise });
});

// OK
app.getAsync('/1aa', (req, res, next) => {
    const promise = req.query.err !== undefined ? fails() : succeeds();
    return promise.then((message) => {
        res.send({ Message: message });
    });
});

// OK
app.getAsync('/1bb', async (req, res, next) => {
    res.send({ Message: await fails() });
});

// ---------------------------------------------------------------------------

// Missing "await" - Promise has no impact on response.
//
// (node:636) [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated.
// In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
app.getAsync('/4', async (req, res, next) => {
    fails();
    res.send({ Message: 'all done' });
});

app.getAsync('/5', async (req, res, next) => {
    await fails();
    res.send({ Message: 'all done' });
});

// ---------------------------------------------------------------------------

// Multiple promises - all required - sequential
app.getAsync('/6', async (req, res, next) => {
    for (let i = 0; i < 5; i++) {
        await succeeds();
    }
    res.send({ Message: 'all done' });
});

// Multiple promises - all required - parallel
app.getAsync('/7', async (req, res, next) => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
        promises.push(succeeds());
    }

    await Promise.all(promises);
    res.send({ Message: 'all done' });
});

// ---------------------------------------------------------------------------

// Error handler
app.use((err, req, res, next) => {
    console.log('error:', err);
    res.send({ Error: err.stack && err.stack.split('\n') });
    next();
});



app.listen(3000, () => console.log('Listening on port 3000'));
