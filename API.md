# concat

create a Readable from an array of stream

**Parameters**

-   `arr` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;Any>** 

Returns **Readable** 

# log

create a Transform stream that take a log function

**Parameters**

-   `fn`  

Returns **Transform** 

# fromArray

create a Readable from an array

**Parameters**

-   `arr` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;T>** 

Returns **Readable** 

# toArray

create a Thenable Transform stream that buffer each data chunk into an array

Returns **ToArrayStream** 

# toObject

create a Thenable Transform stream that merge each data chunk into an object

Returns **ToObjectStream** 

# readAsync

create a Readable stream from an async function

**Parameters**

-   `fn`  

Returns **Readable** 

# readSync

create a Readable stream from a sync function

**Parameters**

-   `fn`  

Returns **Readable** 

# throughAsync

create a transform stream that take an async transform function

**Parameters**

-   `fn`  

Returns **Transform** 

# throughSync

create a transform stream that take a sync transform function

**Parameters**

-   `fn`  

Returns **Transform** 

# filterSync

create a filtered transform stream that take a sync filter function

**Parameters**

-   `fn`  

Returns **Transform** 

# filterAsync

create a filtered transform stream that take an async filter function

**Parameters**

-   `fn`  

Returns **Transform** 

# mapSync

create a transform stream that take a sync mapping function

**Parameters**

-   `fn`  

Returns **Transform** 

# mapAsync

create a transform stream that take an async mapping function

**Parameters**

-   `fn`  

Returns **Transform** 

# consume

create a stream in flowing mode from a factory function
 using domain behind the scene to catch any uncaught error.

**Parameters**

-   `createStream`  

Returns **Readable** 

# toPromise

create a promise from a stream

**Parameters**

-   `stream` **Readable** 

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;Any>** 
