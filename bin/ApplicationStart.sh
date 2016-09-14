#!/usr/bin/env bash
export NODE_ENV=production
forever start /home/ec2-user/vrshow/server/index.js
