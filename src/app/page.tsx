import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <p className={styles.label}>NEXT.JS STARTER</p>
        <h1>Your app starts here.</h1>
        <p>Edit <code>src/app/page.tsx</code> to build something of your own.</p>
        <a href="https://nextjs.org/docs">Read the documentation &rarr;</a>
      </div>
    </main>
  );
}
