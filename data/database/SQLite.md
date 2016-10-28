## SQLite

<h3>1.创建表</h3>

SQLite数据类型

integer：整数值

real：浮点数

text:文本

blob：二进制大对象

NULL


唯一性约束`UNIQUE`

```
CREATE TABLE Contacts (id INTEGER PRIMARY KEY,name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT 'UNKNOWN',UNIQUE(name,phone));

INSERT INTO Contacts (name,phone) values ('Jerry','UNKNOWN');
//再次插入会出现错误
INSERT INTO Contacts (name,phone) values ('Jerry','UNKNOWN');
Error: UNIQUE constraint failed: Contacts.name, Contacts.phone
//插入成功，因为name自身不是唯一的，但是name和phone合起来是唯一的
INSERT INTO Contacts (name,phone) values ('Jerry','555-1212');
```
NULL不等于任何值，甚至不等于其他的NULL所以不会出现NULL冲突。

主键约束

`NOT NULL`约束

`check`约束

check约束允许定义表达式来测试要插入或者更新的字段值。

```
CREATE TABLE Foo ( x INTEGER,y INTEGER CHECK (y>x), z INTEGER CHECK (z>abs(y)));
INSERT INTO Foo VALUES (-2,-1,2);
sqlite> INSERT INTO Foo VALUES (-2,-1,1);
//不满足条件出错
INSERT INTO Foo VALUES (-2,-1,1);
Error: CHECK constraint failed: Foo
```

SQLite提供了5种可能的冲突解决方案来解决冲突：`replace`、`ignore`、`fail`、`abort`、`rollback`。

`replace`：当违反了唯一性约束时，新记录会替代原来的记录
```
CREATE TABLE Contacts (id INTEGER PRIMARY KEY,name TEXT NOT NULL,phone TEXT UNIQUE ON CONFLICT REPLACE);
sqlite> INSERT INTO Contacts (name,phone) values ('Jerry','12345678');sqlite> INSERT INTO Contacts (name,phone) values ('Tom','12345678');
SELECT * FROM Contacts;
2|Tom|12345678
```

```sql
CREATE TABLE COMPANY(
   ID INT PRIMARY KEY     NOT NULL,
   NAME           TEXT    NOT NULL,
   AGE            INT     NOT NULL,
   ADDRESS        CHAR(50),
   SALARY         REAL    DEFAULT 50000.00,
   UNIQUE (NAME,AGE) ON CONFLICT REPLACE
);
INSERT INTO COMPANY VALUES (0,"MLK",22,"ABC",20000.0);
//替换上一条
INSERT INTO COMPANY VALUES (1,"MLK",22,"ABC",20000.0);
//替换上一条
INSERT INTO COMPANY VALUES (2,"MLK",22,"EFG",10000.0);
INSERT INTO COMPANY VALUES (3,"MLK",23,"EFG",10000.0);
SELECT * FROM COMPANY;
//查询结果
2|MLK|22|EFG|10000.0
3|MLK|23|EFG|10000.0
```

`ignore`：违反唯一性约束，将忽略新的记录。
```
CREATE TABLE Contacts (id INTEGER PRIMARY KEY,name TEXT NOT NULL,phone TEXT UNIQUE ON CONFLICT IGNORE);
INSERT INTO Contacts (name,phone) values ('Jerry','12345678');
INSERT INTO Contacts (name,phone) values ('Tom','12345678');
SELECT * FROM Contacts;
1|Jerry|12345678
```
`fail`：当约束发生时，SQLite终止命令，但是不恢复约束违反之前已经修改的记录。也就是说，在约束违法发生前的改变都保留。例如，如果update命令在第100行违法约束，那么前99行已经修改的记录不会回滚。对第100行和之外的改变不会发生，因为命令已经终止了。

abort：当约束违反发生时，SQLite恢复命令所做的所有改变并终止命令。abort是SQLite中所有操作的默认解决方法，也是SQL标准定义的行为。

rollback：当约束违反发生时，SQLite执行回滚，终止当前命令和整个事务。


<h3>LIMIT</h3>

```
CREATE TABLE Persons (Id Integer PRIMARY KEY AUTOINCREMENT,LastName varchar(20),FirstName varchar(20),Address varchar(30),City varchar(20));

INSERT INTO Persons VALUES (1,'Adams','John','Oxford Street','London');
INSERT INTO Persons VALUES (2,'Bush','George','Fifth Avenue','New York');
INSERT INTO Persons VALUES (3,'Carter','Thomas','Changan','Beijing');
INSERT INTO Persons values (4,'Gates','Bill','Xuanwumen10','Beijing');

SELECT * FROM Persons;
1|Adams|John|Oxford Street|London
2|Bush|George|Fifth Avenue|New York
3|Carter|Thomas|Changan|Beijing
4|Gates|Bill|Xuanwumen10|Beijing

SELECT * FROM Persons LIMIT 1,3;
2|Bush|George|Fifth Avenue|New York
3|Carter|Thomas|Changan|Beijing
4|Gates|Bill|Xuanwumen10|Beijing
```



<h3>LIKE操作符和GLOB操作符</h3>

```
CREATE TABLE Persons (Id Integer PRIMARY KEY AUTOINCREMENT,LastName varchar(20),FirstName varchar(20),Address varchar(30),City varchar(20));

INSERT INTO Persons VALUES (1,'Adams','John','Oxford Street','London');
INSERT INTO Persons VALUES (2,'Bush','George','Fifth Avenue','New York');
INSERT INTO Persons VALUES (3,'Carter','Thomas','Changan','Beijing');
SELECT * FROM Persons;
1|Adams|John|Oxford Street|London
2|Bush|George|Fifth Avenue|New York
3|Carter|Thomas|Changan|Beijing

//从Persons表中获取居住在以N开始的城市里的人

SELECT * FROM Persons WHERE City LIKE 'N%';
2|Bush|George|Fifth Avenue|New York
//从 "Persons" 表中选取居住在包含 "lon" 的城市里的人
SELECT * FROM Persons WHERE City LIKE '%lon%';
1|Adams|John|Oxford Street|London

//从 "Persons" 表中选取居住在以 "g" 结尾的城市里的人
SELECT * FROM Persons WHERE City LIKE '%g';
3|Carter|Thomas|Changan|Beijing
通配符


%	替代一个或多个字符
_	仅替代一个字符
[charlist]	字符列中的任何单一字符
[^charlist]
或者
[!charlist]
不在字符列中的任何单一字符

```

GLOB操作符在行为上与LIKE操作符相似。

```
SELECT * FROM Persons WHERE City GLOB 'B*';
3|Carter|Thomas|Changan|Beijing
4|Gates|Bill|Xuanwumen10|Beijing
```


<h3>IN 操作符</h3>

IN 操作符允许我们在 WHERE 子句中规定多个值。

```
CREATE TABLE Persons (Id Integer PRIMARY KEY AUTOINCREMENT,LastName varchar(20),FirstName varchar(20),Address varchar(30),City varchar(20));

INSERT INTO Persons VALUES (1,'Adams','John','Oxford Street','London');
INSERT INTO Persons VALUES (2,'Bush','George','Fifth Avenue','New York');
INSERT INTO Persons VALUES (3,'Carter','Thomas','Changan','Beijing');
SELECT * FROM Persons;
1|Adams|John|Oxford Street|London
2|Bush|George|Fifth Avenue|New York
3|Carter|Thomas|Changan|Beijing

//从列表中选取姓氏为Adams和Carter的人

SELECT * FROM Persons WHERE LastName IN ('Adams','Carter');
1|Adams|John|Oxford Street|London
3|Carter|Thomas|Changan|Beijing
```

<h3>BetWeen 操作符</h3>

操作符 BETWEEN ... AND会选取介于两个值之间的数据范围。

```
CREATE TABLE Persons (Id Integer PRIMARY KEY AUTOINCREMENT,LastName varchar(20),FirstName varchar(20),Address varchar(30),City varchar(20));

INSERT INTO Persons VALUES (1,'Adams','John','Oxford Street','London');
INSERT INTO Persons VALUES (2,'Bush','George','Fifth Avenue','New York');
INSERT INTO Persons VALUES (3,'Carter','Thomas','Changan','Beijing');
INSERT INTO Persons values (4,'Gates','Bill','Xuanwumen10','Beijing');

SELECT * FROM Persons;
1|Adams|John|Oxford Street|London
2|Bush|George|Fifth Avenue|New York
3|Carter|Thomas|Changan|Beijing
4|Gates|Bill|Xuanwumen10|Beijing

//以字母顺序显示介于 "Adams"（包括）和 "Carter"之间的人
SELECT * FROM Persons WHERE LastName BETWEEN 'Adams' AND 'Carter';
1|Adams|John|Oxford Street|London
2|Bush|George|Fifth Avenue|New York
3|Carter|Thomas|Changan|Beijing

//显示上述范围之外的人，使用NOT操作符
SELECT * FROM Persons WHERE LastName NOT BETWEEN 'Adams' AND 'Carter';
4|Gates|Bill|Xuanwumen10|Beijing
```

<h3>Alias 别名</h3>

```
CREATE TABLE Persons (Id Integer PRIMARY KEY AUTOINCREMENT,LastName varchar(20),FirstName varchar(20),Address varchar(30),City varchar(20));

INSERT INTO Persons VALUES (1,'Adams','John','Oxford Street','London');
INSERT INTO Persons VALUES (2,'Bush','George','Fifth Avenue','New York');
INSERT INTO Persons VALUES (3,'Carter','Thomas','Changan','Beijing');
INSERT INTO Persons values (4,'Gates','Bill','Xuanwumen10','Beijing');

SELECT * FROM Persons;
1|Adams|John|Oxford Street|London
2|Bush|George|Fifth Avenue|New York
3|Carter|Thomas|Changan|Beijing
4|Gates|Bill|Xuanwumen10|Beijing

SELECT LastName As Family,FirstName As Name FROM Persons;
Adams|John
Bush|George
Carter|Thomas
Gates|Bill
```

<h3>Null值</h3>

如果表中的某个列是可选的，那么我们可以在不向该列添加值的情况下插入新记录或更新已有的记录。这意味着该字段将以 NULL 值保存。

无法比较 NULL 和 0；它们是不等价的。

```
//选取在 "Address" 列中带有 NULL 值的记录
SELECT LastName,FirstName,Address FROM Persons Where Address IS NULL;
//选取在 "Address" 列中不带有 NULL 值的记录
 SELECT LastName,FirstName,Address FROM Persons Where Address IS NOT NULL;
```




<h3>UNION和UNION ALL操作符</h3>

UINON操作符用于合并两个或多个SELECT语句的结果集。

请注意，UNION 内部的 SELECT 语句必须拥有相同数量的列。列也必须拥有相似的数据类型。同时，每条 SELECT 语句中的列的顺序必须相同。


```
CREATE TABLE Employees_China (E_ID Integer,E_Name varchar(20));
INSERT INTO Employees_China VALUES (01,'Zhang,Hua');
INSERT INTO Employees_China VALUES (02,'Wang,Wei');
INSERT INTO Employees_China VALUES (03,'Carter,Thomas');
INSERT INTO Employees_China VALUES (04,'Yang,Ming');
SELECT E_Name FROM Employees_China;
E_ID        E_Name
----------  ----------
1           Zhang,Hua
2           Wang,Wei
3           Carter,Tho
4           Yang,Ming


CREATE TABLE Employees_USA (E_ID Integer,E_Name varchar(20));
INSERT INTO Employees_USA VALUES (01,'Adams,John');
INSERT INTO Employees_USA VALUES (02,'Bush,George');
INSERT INTO Employees_USA VALUES (02,'Carter,Thomas');
INSERT INTO Employees_USA VALUES (04,'Gates,Bill');

SELECT * FROM Employees_USA;
E_ID        E_Name
----------  ----------
1           Adams,John
2           Bush,Georg
3           Carter,Tho
4           Gates,Bill
//使用UNION命令 UNION 命令只会选取不同的值。
SELECT E_Name FROM Employees_China UNION SELECT E_Name From Employees_USA;
E_Name
----------
Adams,John
Bush,Georg
Carter,Tho
Gates,Bill
Wang,Wei
Yang,Ming
Zhang,Hua
//使用 UNION ALL 命令

SELECT E_Name FROM Employees_China UNION ALL SELECT E_Name From Employees_USA;

E_Name
----------
Zhang,Hua
Wang,Wei
Carter,Tho
Yang,Ming
Adams,John
Bush,Georg
Carter,Tho
Gates,Bill
```
<h3>GROUP BY</h3>

```
CREATE TABLE Orders (O_Id Integer PRIMARY KEY AUTOINCREMENT,OrderDate varchar(20),OrderPrice Integer,Customer varchar(20));
INSERT INTO Orders VALUES (1,'2008/12/29','1000','Bush');
INSERT INTO Orders VALUES (2,'2008/11/23','1600','Carter');
INSERT INTO Orders VALUES (3,'2008/10/05','700','Bush');
INSERT INTO Orders VALUES (4,'2008/9/28','300','Bush');
INSERT INTO Orders VALUES (5,'2008/8/6','2000','Adams');
INSERT INTO Orders VALUES (6,'2008/7/21','100','Carter');
SELECT * FROM Orders;
1|2008/12/29|1000|Bush
2|2008/11/23|1600|Carter
3|2008/10/05|700|Bush
4|2008/9/28|300|Bush
5|2008/8/6|2000|Adams
6|2008/7/21|100|Carter

SELECT Customer,SUM(OrderPrice) FROM Orders GROUP BY Customer;
Adams|2000
Bush|2000
Carter|1700
```

