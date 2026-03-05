#!/bin/bash
cd backend
cargo run 2>&1 | tee backend.log
