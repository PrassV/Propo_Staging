#!/bin/bash
cd Backend
export PYTHONPATH=$PYTHONPATH:$PWD
python -m uvicorn app.main:app --host=0.0.0.0 --port=${PORT:-8000} --timeout-keep-alive=300 