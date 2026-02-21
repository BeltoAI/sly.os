#!/bin/bash
# Force install all dependencies before app starts
# EB caches node_modules and skips new packages - this ensures they're installed
cd /var/app/staging
echo "=== Running npm install for RAG dependencies ==="
npm install --production 2>&1
echo "=== npm install complete ==="
echo "=== Checking multer installation ==="
node -e "try { require('multer'); console.log('multer: OK'); } catch(e) { console.log('multer: MISSING'); }"
node -e "try { require('pdf-parse'); console.log('pdf-parse: OK'); } catch(e) { console.log('pdf-parse: MISSING'); }"
node -e "try { require('mammoth'); console.log('mammoth: OK'); } catch(e) { console.log('mammoth: MISSING'); }"
node -e "try { require('express-rate-limit'); console.log('express-rate-limit: OK'); } catch(e) { console.log('express-rate-limit: MISSING'); }"
