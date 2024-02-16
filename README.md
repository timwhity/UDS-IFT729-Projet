# Projet IFT729 - Tableau interactif en temps réel

## Description

Ce projet a pour but de créer un tableau interactif en temps réel. Les utilisateurs peuvent se connecter à l'application et dessiner sur le tableau. Les dessins sont synchronisés en temps réel entre les utilisateurs connectés.

## Installation

Pour installer le projet, il suffit de cloner le dépôt git et d'installer les dépendances.

```bash
npm install
npm run dev
```

## Technologies

- Node.js
- Express.js : backend du serveur
- Socket.io : communication en temps réel
- ejs : moteur de template pour le rendu côté serveur
- fabric.js : librairie pour le dessin sur le canvas


## Base de données

### Users

Utilisateurs de l'application : Voici les différentes colonnes :
- username : nom d'utilisateur, VARCHAR(50), PRIMARY KEY
- salt : sel pour le hashage du mot de passe, VARCHAR(100)
- hash : mot de passe hashé, VARCHAR(200)
- created_at : date de création de l'utilisateur, TIMESTAMP

Pour créer la base de donnée : 
```sql
CREATE TABLE users (
	username VARCHAR(50) PRIMARY KEY,
	salt VARCHAR(100),
	hash VARCHAR(200),
	created_at TIMESTAMP
);
```
