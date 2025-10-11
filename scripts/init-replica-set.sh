#!/bin/bash
# MongoDB Replica Set 初始化腳本

echo "等待 MongoDB 啟動..."
sleep 10

echo "初始化 Replica Set..."
mongosh --eval "
  try {
    rs.status()
    print('Replica Set 已經初始化')
  } catch (err) {
    print('開始初始化 Replica Set...')
    rs.initiate({
      _id: 'rs0',
      members: [
        { _id: 0, host: 'mongodb:27017' }
      ]
    })
    print('Replica Set 初始化完成')
  }
"

echo "Replica Set 配置完成"
