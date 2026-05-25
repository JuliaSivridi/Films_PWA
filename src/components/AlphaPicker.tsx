import styles from './AlphaPicker.module.css'

interface Props {
  letters: string[]                    // only letters that actually have films
  onSelect: (letter: string) => void
  onClose: () => void
}

export default function AlphaPicker({ letters, onSelect, onClose }: Props) {
  return (
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={styles.picker}>
        <div className={styles.grid}>
          {letters.map(l => (
            <button
              key={l}
              className={styles.letterBtn}
              onClick={() => onSelect(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
