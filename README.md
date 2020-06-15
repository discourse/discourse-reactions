# discourse-reactions

ALPHA don't use yet unless you know what you are doing.

## API

### Create a reaction

```
POST /discourse-reactions/custom-reactions.json

{
  post_id: 1,
  reaction: 'otter'
}
```

### List reactions

```
GET /discourse-reactions/custom-reactions.json?post_id=1
```

### Destroy reaction

```
DELETE /discourse-reactions/custom-reactions.json

{
  post_id: 1,
  reaction: 'otter'
}
```
