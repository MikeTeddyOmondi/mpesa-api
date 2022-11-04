FROM python:3.10
LABEL Company "Rancko Solutions LLC"

ENV PYTHONUNBUFFERED 1

RUN apt-get update && python -m pip install --upgrade pip && rm -rf /var/lib/apt/lists/*

RUN mkdir /src
WORKDIR /src

COPY ./requirements.txt ./requirements.txt
RUN pip install -r ./requirements.txt

COPY . .

RUN adduser -D user
USER user

RUN chmod +x ./entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]

CMD ["python", "manage.py",  "runserver", "0.0.0.0:8000"]