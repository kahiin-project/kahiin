FROM python:3.12-slim-bullseye

WORKDIR /kahiin

COPY . .

RUN pip3 install --no-cache-dir --upgrade pip

RUN pip3 install --no-cache-dir -r requirements.txt

EXPOSE 8080
EXPOSE 5000

# set network to host
CMD ["python3", "app.py"]