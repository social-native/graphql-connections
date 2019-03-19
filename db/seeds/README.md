# Seeds for `mock` table

There are 10,000 rows in the `mock` table

The seeded data has the following properties:

## Columns

### Username

All usernames are unique

| Number of people with a `username` | Username |
|------------------------------------|----------|
| 10000  | <unique> |

### Firstname

310 firstnames are defined

| Number of people with same `firstname` | Firstname |
|----------------------------------------|----------|
| 10  | Reggie |
| 20  | Marrilee |
| 40  | Kelbee |
| 80  | Nerissa |
| 160 | Kenyon |

### Lastname

| Number of people with same `lastname`  | Lastname |
|----------------------------------------|----------|
| 2  | Gross |
| 4  | Candaele |
| 8  | Chew |
| 10  | Summa |
| 32 | `null`

### Bio

| Number of `bios` which include a word  | Word |
|----------------------------------------|-----------|
| 2  | famelicose |
| 4  | sodalitious |

### Age

| Number of people with an `age`  | Age |
|----------------------------------------|----------|
| 1000  | 20 |
| 1000  | 30 |
| 1000  | 40 |
| 1000  | 50 |
| 1000  | 60 |
| 1000  | 70 |
| 1000  | 80 |
| 1000  | 90 |
| 1000  | 100 |
| 1000  | 110 |

### Haircolor

| Number of people with a `haircolor`  | Color |
|----------------------------------------|----------|
| 6000  | brown |
| 2000  | black |
| 1000  | blonde |
| 500  | red |
| 100  | gray |
| 400 | `null`

## Cases

### Case A

- 600 people `age` N have brown `hair` (6000 people total across all `ages`)
- 200 people `age` N have black `hair` (2000 people total across all `ages`)
- 100 people `age` N have blonde `hair` (1000 people total across all `ages`)
- 50 people `age` N have red `hair` (500 people total across all `ages`)
- 10 people `age` N have gray `hair` (100 people total across all `ages`)
- 40 people `age` N dont have a `hair` color listed (400 people total across all `ages`)

### Case B

- 16 people `age` N have brown `hair` and the `first name` Kenyon (160 people total across all `ages`)
- 8 people `age` N have brown `hair` and the `first name` Nerissa (80 people total across all `ages`)

### Case C

- 1 person `age` N has brown `hair`, the `first name` Kenyon and the `last name` Summa (10 people total across all `ages`)

