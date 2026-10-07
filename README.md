# HomePulse — Система мониторинга домашней инфраструктуры

Современный аналог AIDA64 для мониторинга и управления серверами, ПК и IoT-устройствами дома.

## Возможности

- **Мониторинг в реальном времени**: CPU, RAM, диск, температура, сеть
- **Информация о железе** (в стиле AIDA64)
- **История метрик** с графиками
- **Авторизация + 2FA** (Google Authenticator / Authy)
- **Агенты** для Windows / Linux / macOS
- **Красивый тёмный интерфейс**

## Быстрый старт (Windows 11)

### 1. Установите Docker Desktop

Скачайте и установите: https://www.docker.com/products/docker-desktop/

После установки **перезагрузите компьютер** и запустите Docker Desktop.

### 2. Скачайте проект

Распакуйте папку `HomePulse` в удобное место, например `C:\HomePulse`.

### 3. Запустите всё одной командой

Откройте **PowerShell** или **Terminal** в папке проекта:

```powershell
cd C:\HomePulse
docker compose up --build
```

Первый запуск займёт 2–5 минут (скачивание образов).

После успешного старта:

- **Frontend**: http://localhost:3000
- **Backend API + Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health

### 4. Создайте аккаунт

1. Откройте http://localhost:3000
2. Нажмите «Зарегистрироваться»
3. Введите email и пароль

### 5. Добавьте устройство и получите API-ключ

1. На дашборде нажмите **«Добавить»**
2. Укажите название (например «Мой ПК»)
3. **Скопируйте API-ключ** (он показывается только один раз!)

### 6. Запустите агент на своём компьютере

#### Вариант A — через Python (рекомендуется)

1. Установите Python 3.11+ с https://www.python.org/downloads/  
   (поставьте галочку **Add Python to PATH**)

2. Откройте PowerShell:

```powershell
cd C:\HomePulse\agent
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
```

3. Создайте файл `.env` в папке `agent`:

```
HOMEPULSE_API_URL=http://localhost:8000/api/v1
HOMEPULSE_API_KEY=вставь_сюда_свой_ключ
HOMEPULSE_INTERVAL=10
```

4. Запустите агент:

```powershell
python agent.py
```

Вы должны увидеть сообщения `Metrics sent OK`.

### 7. Смотрите данные

Обновите дашборд — устройство станет Online, появятся метрики и графики.

---

## Структура проекта

```
HomePulse/
├── backend/          # FastAPI + PostgreSQL
├── frontend/         # React + TypeScript + Tailwind
├── agent/            # Агент сбора метрик (Python + psutil)
├── docker-compose.yml
└── README.md
```

## Архитектура (соответствует требованиям курса)

| Компонент | Реализация |
|-----------|------------|
| Frontend | React + TypeScript + Tailwind + Recharts |
| Backend | FastAPI (async) |
| БД | PostgreSQL |
| Авторизация + 2FA | JWT + TOTP (pyotp) |
| Сетевое взаимодействие | REST API |
| Многопоточность / асинхронность | FastAPI async + агенты |
| Функциональные модули | Сбор метрик, hardware info, история |

## Полезные команды

```powershell
# Остановить всё
docker compose down

# Пересобрать после изменений
docker compose up --build

# Посмотреть логи backend
docker compose logs -f backend

# Очистить базу (осторожно!)
docker compose down -v
```

## Включение 2FA

1. Войдите в аккаунт
2. Перейдите в **Настройки** (иконка шестерёнки)
3. Нажмите «Настроить 2FA»
4. Отсканируйте секрет в Google Authenticator / Authy
5. Введите код подтверждения

После этого при каждом входе будет запрашиваться код.

## Для лабораторных работ

Проект полностью покрывает требования:

- Графический интерфейс
- База данных + модуль взаимодействия
- Backend с авторизацией, 2FA, асинхронностью
- Сетевое взаимодействие
- Функциональные модули (сбор и анализ метрик)
- Git-ready структура


